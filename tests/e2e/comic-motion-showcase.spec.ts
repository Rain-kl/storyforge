import { expect, test, type Page } from '@playwright/test'

const playerPath = './demo-assets/last-letter/index.html'
const audioTime = (page: Page) => page.locator('#sound').evaluate((audio: HTMLAudioElement) => audio.currentTime)
async function seek(page: Page, seconds: number) {
  await page.locator('#seek').fill(String(seconds))
  await page.locator('#seek').dispatchEvent('input')
}

test('comic library and homepage examples expose the same read-only, lazy-loaded motion showcase', async ({ page, context }) => {
  const requests: string[] = []
  page.on('request', request => requests.push(request.url()))
  for (const entry of ['./comic/library', './home/examples?type=comic']) {
    await page.goto(entry)
    await expect(page.getByRole('heading', { name: '末班来信', exact: true })).toBeVisible()
    const card = page.locator('.comic-motion-showcase')
    await expect(card).toContainText('不代表当前漫画产品可自动生成同等动画')
    await expect(card.getByRole('link', { name: '播放完整短片' })).toHaveAttribute('href', '/storyforge/demo-assets/last-letter/index.html')
    await expect(page.locator('.comic-showcase-card')).toHaveCount(4)
  }
  expect(requests.filter(url => /last-letter\/(?:player\.|assets\/(?!portrait\.webp))/.test(url))).toEqual([])
  // In the source E2E workspace, prove viewing creates no author works.
  const works = () => page.evaluate(async () => {
    const { db } = await new Function('return import("/storyforge/src/lib/db/schema.ts")')()
    return db.works.count()
  })
  const before = process.env.PLAYWRIGHT_PRODUCTION_PREVIEW ? null : await works()
  const opened = context.waitForEvent('page')
  await page.getByRole('link', { name: '播放完整短片', exact: true }).click()
  const player = await opened
  await expect(player.locator('#start')).toBeEnabled()
  await expect(player).toHaveURL(/\/storyforge\/demo-assets\/last-letter\/index\.html$/)
  expect(await player.evaluate(() => window.opener)).toBeNull()
  expect(await player.locator('#sound').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true)
  if (before !== null) expect(await works()).toBe(before)
  await player.close()
})

test('prepared movie plays, seeks with sound, compares stills, stops and replays without model requests', async ({ page }) => {
  const errors: string[] = [], requests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('request', request => requests.push(request.url()))
  await page.goto(playerPath)
  await expect(page.locator('#start')).toBeEnabled()
  await page.locator('#start').click()
  await expect.poll(() => audioTime(page)).toBeGreaterThan(.3)
  await page.locator('#play').click()
  const paused = await audioTime(page)
  await page.waitForTimeout(200)
  expect(await audioTime(page)).toBeCloseTo(paused, 1)
  await seek(page, 33)
  await expect.poll(() => audioTime(page)).toBeCloseTo(33, 0)
  await page.locator('#play').click()
  await expect.poll(() => audioTime(page)).toBeGreaterThan(33.2)
  await expect(page.locator('#clock')).toContainText('00:33')
  await page.locator('#play').click()
  await page.locator('#compare').click()
  await expect(page.locator('#compare')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('#badge')).toHaveClass(/show/)
  await page.locator('#compare').click()
  await page.locator('#mute').click()
  expect(await page.locator('#sound').evaluate((audio: HTMLAudioElement) => audio.muted)).toBe(true)
  await page.locator('#full').click()
  await expect.poll(() => page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true)
  await page.evaluate(() => document.exitFullscreen())
  await seek(page, 49.7)
  await page.locator('#play').click()
  await expect(page.locator('#clock')).toHaveText('00:50 / 00:50')
  await expect(page.locator('#play')).toHaveText('播放')
  await page.locator('#restart').click()
  await expect.poll(() => audioTime(page)).toBeLessThan(2)
  await expect(page.locator('#play')).toHaveText('暂停')
  await page.reload()
  await expect(page.locator('#start')).toBeEnabled()
  await expect(page.locator('#clock')).toHaveText('00:00 / 00:50')
  expect(await page.locator('#sound').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true)
  expect(errors).toEqual([])
  expect(requests.every(url => new URL(url).origin === new URL(page.url()).origin)).toBe(true)
})

test('player fits a phone, returns to comic examples, and pauses when hidden', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(playerPath)
  await expect(page.locator('#start')).toBeEnabled()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  await page.locator('#start').click()
  await expect(page.locator('#play')).toHaveText('暂停')
  // Lifecycle event is deterministic in headless Chromium (tabs may all remain visible).
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect(page.locator('#play')).toHaveText('播放')
  expect(await page.locator('#sound').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true)
  await page.getByRole('link', { name: '返回漫画示例' }).click()
  await expect(page).toHaveURL(/\/storyforge\/home\/examples\?type=comic$/)
  await expect(page.locator('.comic-motion-showcase')).toBeVisible()
  expect(context.pages()).toHaveLength(1)
})

test('missing image fails visibly and cannot start a broken movie', async ({ page }) => {
  await page.route('**/assets/blink.webp', route => route.abort())
  await page.goto(playerPath)
  await expect(page.locator('#loadStatus')).toContainText('画面加载失败')
  await expect(page.locator('#start')).toBeDisabled()
  await expect(page.locator('#play')).toBeDisabled()
})

test('unavailable audio degrades visibly to silent playback', async ({ page }) => {
  await page.route('**/soundtrack.wav', route => route.abort())
  await page.goto(playerPath)
  await expect(page.locator('#start')).toBeEnabled()
  await page.locator('#start').click()
  await expect(page.locator('#mute')).toHaveText('声音不可用', { timeout: 15000 })
  await expect(page.locator('#clock')).not.toHaveText('00:00 / 00:50')
  await page.locator('#play').click()
  await expect(page.locator('#play')).toHaveText('播放')
})
