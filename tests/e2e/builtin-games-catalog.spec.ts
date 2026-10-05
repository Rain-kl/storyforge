import { expect, test } from '@playwright/test'

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`内置游戏只在文字开放世界展示，介绍页不安装内容 ${viewport.width}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport)
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto('./')
    await expect(page.getByRole('heading', { name: '天地为炉， 万象成故事。' })).toBeVisible()
    await expect(page.getByRole('region', { name: '内置叙事游戏', exact: true })).toHaveCount(0)
    await page.goto('openworld')
    const shelf = page.getByRole('region', { name: '内置叙事游戏', exact: true })
    await expect(shelf).toBeVisible()
    await expect(shelf.getByRole('link')).toHaveCount(3)
    await page.screenshot({ path: testInfo.outputPath('builtin-games-catalog.png'), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const games = [
      { name: '游玩内置短篇：潮痕，两声之间', path: 'tidemark-echo', back: '返回内置游戏' },
      { name: '游玩内置游戏：潮痕，最后一盏灯', path: 'tidemark', back: '文字开放世界' },
      { name: '游玩内置游戏：远日点，第七码头', path: 'aphelion', back: '返回文字开放世界' },
    ]
    for (const game of games) {
      await shelf.getByRole('link', { name: game.name, exact: true }).click()
      await expect(page).toHaveURL(new RegExp(`/play/${game.path}$`))
      await expect(page.getByRole('main')).toBeVisible()
      await page.getByRole('link', { name: new RegExp(game.back) }).first().click()
      await expect(shelf).toBeVisible()
    }
    const counts = await page.evaluate(async () => {
      const importer = new Function('path', 'return import(path)') as (path: string) => Promise<any>
      const { db } = await importer('/storyforge/src/lib/db/schema.ts')
      return { projects: await db.projects.count(), releases: await db.productReleases.count(), sessions: await db.productRuntimeSessions.count() }
    })
    expect(counts).toEqual({ projects: 0, releases: 0, sessions: 0 })
    expect(errors).toEqual([])
  })
}
