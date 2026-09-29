import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../src/lib/db/schema'
import { readAdventurePlayerPreviews } from '../../src/lib/adventure/player-previews'
import { seedCurrentProductBuild } from '../helpers/current-product-build'
import { loadCurrentProductWorldSourceCatalogV1, seedCurrentProductWorld } from '../helpers/current-product-world'
import { createTextAdventureFoundationRuntimePackageV2 } from '../helpers/text-adventure-v2-foundation'

describe('文字冒险作品库 · 冻结试玩入口', () => {
  beforeEach(async () => { await db.delete(); await db.open() })
  afterEach(() => db.close())

  async function seed(title: string) {
    const owned = await seedCurrentProductWorld(title)
    const sourceCatalog = await loadCurrentProductWorldSourceCatalogV1({
      scope: owned.scope, worldReleaseId: owned.release.id!, productType: 'text-adventure',
    })
    const runtimePackage = createTextAdventureFoundationRuntimePackageV2({
      worldRelease: owned.release as typeof owned.release & { id: number }, sourceCatalog,
    })
    const built = await seedCurrentProductBuild({
      scope: owned.scope, worldRelease: owned.release as typeof owned.release & { id: number }, runtimePackage, title,
    })
    return { ...owned, built }
  }

  it('没有正式发布也能发现当前冻结试玩，且不跨作品读取、不创建新存档', async () => {
    const first = await seed('本作品')
    await seed('另一作品')
    const before = await db.productRuntimeSessions.count()
    const items = await readAdventurePlayerPreviews(first.scope)
    expect(items).toHaveLength(1)
    expect(items[0].manifest?.productType).toBe('text-adventure')
    expect(items[0].error).toBe('')
    expect(items[0].title).toBe('本作品')
    expect(await db.productRuntimeSessions.count()).toBe(before)
    expect(await readAdventurePlayerPreviews({ ...first.scope, worldId: first.scope.worldId + 100 })).toEqual([])
  })

  it('损坏的冻结 hash 留下不可开始的错误条目；制作中和过期指针不进入试玩目录', async () => {
    const owned = await seed('校验试玩')
    const [valid] = await readAdventurePlayerPreviews(owned.scope)
    await db.productBuilds.update(valid.buildId, { previewHash: 'tampered' })
    const [broken] = await readAdventurePlayerPreviews(owned.scope)
    expect(broken.manifest).toBeNull()
    expect(broken.error).toContain('hash')
    await db.productBuilds.update(valid.buildId, { previewHash: valid.previewHash, status: 'building' })
    expect(await readAdventurePlayerPreviews(owned.scope)).toEqual([])
    await db.productBuilds.update(valid.buildId, { status: 'preview-ready' })
    await db.productProductions.update(valid.productionId, { currentBuildNumber: valid.buildNumber + 1 })
    expect(await readAdventurePlayerPreviews(owned.scope)).toEqual([])
  })
})
