import { expect, test } from '@playwright/test'
import JSZip from 'jszip'

async function fixture() {
  const zip = new JSZip()
  zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
  zip.file('_rels/.rels', '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>')
  zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>潮痕：最后一盏灯</w:t></w:r></w:p><w:p><w:r><w:t>守灯人说：</w:t></w:r><w:r><w:t>“等我回来。”</w:t></w:r></w:p><w:tbl><w:tr><w:tc><w:p><w:r><w:t>线索</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>盐纸上的名字</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>')
  return Array.from(await zip.generateAsync({ type: 'uint8array' }))
}

test('Word 导入使用真实浏览器解析器保留中文、段落与表格文本', async ({ page }) => {
  await page.goto('./')
  const result = await page.evaluate(async bytes => {
    const importer = new Function('path', 'return import(path)') as (path: string) => Promise<typeof import('../../src/lib/doc-parser')>
    const { extractTextFromFile } = await importer('/storyforge/src/lib/doc-parser.ts')
    return extractTextFromFile(new File([Uint8Array.from(bytes)], '潮痕.docx'))
  }, await fixture())
  expect(result.text).toBe('潮痕：最后一盏灯\n\n守灯人说：“等我回来。”\n\n线索\n\n盐纸上的名字\n\n')
  expect(result.rawChars).toBe(result.text.length)
})

test('损坏的 Word 文件明确失败，不伪装成成功的空白导入', async ({ page }) => {
  await page.goto('./')
  const result = await page.evaluate(async () => {
    const importer = new Function('path', 'return import(path)') as (path: string) => Promise<typeof import('../../src/lib/doc-parser')>
    const { extractTextFromFile } = await importer('/storyforge/src/lib/doc-parser.ts')
    try {
      await extractTextFromFile(new File(['not a docx archive'], '损坏.docx'))
      return { status: 'accepted', message: '' }
    } catch (error) {
      return { status: 'rejected', message: error instanceof Error ? error.message : String(error) }
    }
  })
  expect(result.status).toBe('rejected')
  expect(result.message.length).toBeGreaterThan(0)
})
