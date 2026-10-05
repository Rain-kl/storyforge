import { test, expect, type Page } from '@playwright/test'
import { CAST, CLUES, PLACES, SCENES, STORY_REQUIREMENTS } from '../../src/lib/tidemark/definition'

test.use({ actionTimeout: 15_000 })

async function readingMode(page: Page) {
  await page.getByRole('button', { name: '游戏设置', exact: true }).click()
  await page.getByRole('checkbox', { name: /文字探索/ }).check()
  await page.getByRole('checkbox', { name: /展开本幕对话/ }).check()
  await page.getByRole('button', { name: '关闭面板', exact: true }).click()
}

test('内置游戏真实安装、3D 行走、全主线、机关、存档刷新及另一结局', async ({ page }, testInfo) => {
  test.setTimeout(300_000)
  const errors: string[] = []
  const externalRequests: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const fontHosts = new Set(['fonts.googleapis.com', 'fonts.gstatic.com'])
  page.on('request', request => { if (/^https?:/.test(request.url())) { const hostname = new URL(request.url()).hostname; if (!hostname.match(/^(127\.0\.0\.1|localhost)$/) && !fontHosts.has(hostname)) externalRequests.push(request.url()) } })
  // The shared app shell requests optional web fonts; game startup must also
  // succeed when they cannot load. No model/media provider request is allowed.
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, route => route.abort())
  await page.goto('play/tidemark')
  await expect(page.getByRole('heading', { name: '最后一盏灯', exact: true })).toBeVisible()
  await expect(page.locator('.tm-canvas canvas')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('title-desktop.png') })
  await page.getByRole('button', { name: '踏上白礁镇' }).click()
  await expect(page.getByRole('button', { name: /^与乌荻交谈/ })).toBeVisible({ timeout: 60_000 })
  await page.screenshot({ path: testInfo.outputPath('play-desktop.png') })
  await page.getByRole('button', { name: /地图/ }).click()
  await page.getByRole('button', { name: /^白礁广场/ }).click()
  await expect(page.locator('.tm-place-name')).toContainText('白礁广场', { timeout: 30_000 })
  await readingMode(page)
  await page.context().setOffline(true)
  const settled = () => expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false', { timeout: 15_000 })
  const travel = async (placeKey: string) => {
    await settled()
    const title = PLACES.find(place => place.key === placeKey)!.title
    if ((await page.locator('.tm-place-name').innerText()).includes(title)) return
    if (await page.getByRole('button', { name: '暂时结束交谈' }).isVisible()) await page.getByRole('button', { name: '暂时结束交谈' }).click()
    await page.getByRole('button', { name: /地图/ }).click()
    await page.getByRole('button', { name: new RegExp(`^${title}`) }).click()
    await expect(page.locator('.tm-place-name')).toContainText(title)
    await settled()
  }
  for (const scene of SCENES) {
    const clue = CLUES.find(clue => clue.key === STORY_REQUIREMENTS[scene.key])
    if (clue) {
      if (await page.getByRole('button', { name: '暂时结束交谈' }).isVisible()) await page.getByRole('button', { name: '暂时结束交谈' }).click()
      await travel(clue.place)
      await page.getByRole('button', { name: clue.title, exact: true }).click()
      if (clue.key === 'circuit') {
        const puzzle = page.getByRole('dialog', { name: '三枚铜舌' })
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
        await page.getByRole('button', { name: clue.title, exact: true }).click()
        for (const note of ['低','中','高']) await puzzle.getByRole('button', { name: new RegExp(`^${note}`) }).click()
        await expect(puzzle).toContainText('铜舌没有咬合')
        for (const note of ['低','高','中']) await puzzle.getByRole('button', { name: new RegExp(`^${note}`) }).click()
        await expect(puzzle).not.toBeVisible()
      }
      await settled()
      await expect(page.getByRole('button', { name: clue.title, exact: true })).not.toBeVisible()
    }
    await travel(scene.place)
    if (!(await page.getByRole('region', { name: '剧情对话' }).isVisible())) await page.getByRole('button', { name: new RegExp(`^与${CAST[scene.speaker].name}交谈`) }).click()
    await expect(page.locator('.tm-dialogue header')).toContainText(scene.title)
    if (scene.key !== 's40') { await page.locator('.tm-choices button').first().click(); await settled() }
    if ((scene.order + 1) % 4 === 0) console.info(`主线界面：第 ${scene.chapter + 1} 章`)
  }
  await page.getByRole('button', { name: '暂时结束交谈' }).click()
  await page.getByRole('button', { name: '存档', exact: true }).click()
  await page.getByRole('button', { name: '保存检查点' }).click()
  await expect(page.getByRole('button', { name: '从这里重走' })).toHaveCount(1)
  await page.getByRole('button', { name: '关闭面板' }).click()
  await page.getByRole('button', { name: /^与姜澜交谈/ }).click()
  await expect(page.locator('.tm-choices button')).toHaveCount(4)
  await page.getByRole('button', { name: /^共守黎明/ }).click()
  await expect(page.locator('.tm-dialogue')).toContainText('共守黎明')
  await page.getByRole('button', { name: '回望这段旅程' }).click()
  await expect(page.getByRole('dialog')).toContainText('完成 10/10 章')
  await expect(page.getByRole('dialog').locator('details')).toHaveCount(40)
  await page.context().setOffline(false)
  await page.reload()
  await page.getByRole('button', { name: '继续旅程' }).click()
  await expect(page.getByRole('heading', { name: '共守黎明', exact: true })).toBeVisible()
  await readingMode(page)
  await page.getByRole('button', { name: '存档', exact: true }).click()
  await page.getByRole('button', { name: '从这里重走' }).click()
  await page.getByRole('button', { name: /^与姜澜交谈/ }).click()
  await page.getByRole('button', { name: /^带着名字离开/ }).click()
  await expect(page.locator('.tm-dialogue')).toContainText('家可以重新建在别处')
  expect(errors).toEqual([])
  expect(externalRequests).toEqual([])
})

test('手机尺寸可开始、阅读对话和使用方向控制，无横向溢出', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('play/tidemark')
  await page.screenshot({ path: testInfo.outputPath('title-mobile.png') })
  await page.getByRole('button', { name: '踏上白礁镇' }).click()
  await expect(page.getByRole('button', { name: '向前', exact: true })).toBeVisible({ timeout: 90_000 })
  await page.getByRole('button', { name: '游戏设置', exact: true }).click()
  await page.getByRole('button', { name: '关闭面板', exact: true }).click()
  // Closing a modal restores button focus; gameplay keys must still work.
  await page.keyboard.press('e')
  await expect(page.getByRole('region', { name: '剧情对话' })).toBeVisible()
  await expect(page.locator('.tm-beat')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: testInfo.outputPath('dialogue-mobile.png') })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.getByRole('button', { name: '展开本幕', exact: true }).click()
  await page.locator('.tm-choices button').first().click()
  await expect(page.locator('.tm-dialogue header')).toContainText('一封没有字的信')
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false')
  await page.reload()
  await page.getByRole('button', { name: '继续旅程' }).click()
  await page.getByRole('button', { name: /^与乌荻交谈/ }).click()
  await expect(page.locator('.tm-dialogue header')).toContainText('一封没有字的信')
})


test('三维地图可到达全部地点，关闭设置保留对话，显示偏好刷新保留', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('play/tidemark')
  await page.getByRole('button', { name: '游戏设置', exact: true }).click()
  await page.getByRole('checkbox', { name: /轻量画面/ }).check()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '踏上白礁镇' }).click()
  await expect(page.getByRole('button', { name: /^与乌荻交谈/ })).toBeVisible({ timeout: 60_000 })
  await page.getByRole('button', { name: /^与乌荻交谈/ }).click()
  await page.locator('.tm-next').click()
  const line = await page.locator('.tm-beat p').innerText()
  await page.getByRole('button', { name: '游戏设置', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('region', { name: '剧情对话' })).toBeVisible()
  await expect(page.locator('.tm-beat p')).toHaveText(line)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('region', { name: '剧情对话' })).not.toBeVisible()
  for (const place of [...PLACES.slice(1), PLACES[0]]) {
    await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false')
    await page.keyboard.press('m')
    await page.getByRole('button', { name: new RegExp(`^${place.title}`) }).click()
    await expect(page.locator('.tm-place-name')).toContainText(place.title, { timeout: 30_000 })
  }
  await expect(page.getByRole('main')).toHaveAttribute('aria-busy', 'false')
  await page.getByRole('button', { name: '游戏设置', exact: true }).click()
  await page.getByRole('checkbox', { name: /文字探索/ }).check()
  await page.getByRole('checkbox', { name: /展开本幕对话/ }).check()
  await page.reload()
  await page.getByRole('button', { name: '继续旅程' }).click()
  await expect(page.locator('.tm-place-name')).toContainText('回声码头')
  await expect(page.locator('.tm-canvas')).toHaveCount(0)
  await page.getByRole('button', { name: '游戏设置', exact: true }).click()
  for (const name of [/轻量画面/, /文字探索/, /展开本幕对话/]) await expect(page.getByRole('checkbox', { name })).toBeChecked()
})
