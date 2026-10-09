import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const MAX_ASSET_BYTES = 25 * 1024 * 1024
const PART_BYTES = 16 * 1024 * 1024

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(filename))
    else if (entry.isFile()) files.push(filename)
    else throw new Error(`Unsupported asset: ${filename}`)
  }
  return files
}

export async function prepareCloudflarePages({
  sourceDir = 'dist', outputDir = 'out', maxAssetBytes = MAX_ASSET_BYTES, partBytes = PART_BYTES,
} = {}) {
  const source = path.resolve(sourceDir)
  const output = path.resolve(outputDir)
  if (source === output || source.startsWith(`${output}${path.sep}`) || output.startsWith(`${source}${path.sep}`)) {
    throw new Error('Source and generated output directories must be separate')
  }
  if (partBytes <= 0 || partBytes > maxAssetBytes) throw new Error('Invalid asset part size')
  const sourceFiles = await filesUnder(source)
  for (const filename of sourceFiles) {
    if ((await stat(filename)).size > maxAssetBytes && !filename.endsWith('.json')) {
      throw new Error(`Asset exceeds Cloudflare Pages limit: ${filename}`)
    }
  }
  // Only remove this script's generated output, never source/public assets.
  await rm(output, { recursive: true, force: true })
  const appOutput = path.join(output, 'storyforge')
  await cp(source, appOutput, { recursive: true })
  const manifest = {}
  for (const filename of await filesUnder(appOutput)) {
    const size = (await stat(filename)).size
    if (size <= maxAssetBytes) continue
    const bytes = await readFile(filename)
    const sha256 = createHash('sha256').update(bytes).digest('hex')
    const relativePath = path.relative(output, filename).split(path.sep).join('/')
    const route = `/${relativePath}`
    const partsDirectory = `${filename}.parts/${sha256}`
    await mkdir(partsDirectory, { recursive: true })
    const parts = []
    for (let offset = 0, index = 0; offset < bytes.length; offset += partBytes, index++) {
      const part = bytes.subarray(offset, Math.min(offset + partBytes, bytes.length))
      const partName = `${String(index).padStart(4, '0')}.bin`
      await writeFile(path.join(partsDirectory, partName), part)
      parts.push({ path: `${route}.parts/${sha256}/${partName}`, size: part.length })
    }
    manifest[route] = { size, sha256, parts }
    await rm(filename)
  }
  const routes = Object.keys(manifest)
  if (routes.length) {
    if (routes.length > 100 || routes.some(route => route.length > 100)) throw new Error('Too many or oversized Pages routes')
    const handler = await readFile(new URL('./cloudflare-pages-worker.mjs', import.meta.url), 'utf8')
    await writeFile(path.join(output, '_worker.js'), `${handler}\nexport default createPagesAssetHandler(${JSON.stringify(manifest)});\n`)
    await writeFile(path.join(output, '_routes.json'), JSON.stringify({ version: 1, include: routes, exclude: [] }, null, 2))
  }
  for (const filename of await filesUnder(output)) {
    if ((await stat(filename)).size > maxAssetBytes) throw new Error(`Generated asset exceeds Pages limit: ${filename}`)
  }
  return manifest
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = await prepareCloudflarePages()
  console.log(`[pages] ready: ${Object.keys(manifest).length} large JSON assets split without changing their URLs or bytes`)
}
