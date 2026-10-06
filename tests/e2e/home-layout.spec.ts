import { expect, test } from '@playwright/test'

test('home keeps complete navigation labels on one line and its hero compact across screen sizes', async ({ page }) => {
  // Layout must also work when the optional external Latin font is unavailable.
  await page.route('https://fonts.googleapis.com/**', route => route.abort())
  await page.goto('./')
  await expect(page.locator('.home-hero')).toBeVisible()
  for (const width of [1440, 1024, 768, 651, 390, 320]) {
    await page.setViewportSize({ width, height: 900 })
    if (width <= 650) await page.getByRole('button', { name: '页面目录', exact: true }).click()
    const labels = page.locator('.lf-sidebar nav button, .lf-sidebar footer button')
    await expect(labels).toHaveCount(10)
    const measurements = await labels.evaluateAll(buttons => buttons.map(button => {
      const label = button.querySelector('span')!
      const range = document.createRange()
      range.selectNodeContents(label)
      const lines = [...range.getClientRects()]
      const bounds = button.getBoundingClientRect()
      const icon = button.querySelector('svg')!.getBoundingClientRect()
      return {
        text: label.textContent,
        lines: lines.length,
        fits: lines.every(line => line.left >= bounds.left && line.right <= bounds.right),
        iconWidth: icon.width,
      }
    }))
    for (const label of measurements) {
      expect(label.lines, `${width}px: ${label.text}`).toBe(1)
      expect(label.fits, `${width}px: ${label.text} is not clipped`).toBe(true)
      expect(label.iconWidth).toBeGreaterThanOrEqual(15)
    }
    if (width <= 650) await page.getByRole('button', { name: '页面目录', exact: true }).click()
    const hero = (await page.locator('.home-hero').boundingBox())!
    expect(hero.height, `${width}px hero`).toBeLessThanOrEqual(width > 650 ? 184 : 200)
    const phrases = await page.locator('.home-hero h2 > span').evaluateAll(spans => spans.map(span => {
      const box = span.getBoundingClientRect()
      return { top: box.top, right: box.right }
    }))
    if (width >= 390) expect(phrases[0].top).toBe(phrases[1].top)
    expect(Math.max(...phrases.map(phrase => phrase.right))).toBeLessThanOrEqual(width)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})
