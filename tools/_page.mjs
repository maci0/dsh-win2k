/**
 * The page every audit check drives.
 *
 * One headless Chromium against a live `dsh web` at http://127.0.0.1:3080, one
 * auth cookie from DSH_COOKIE (default /tmp/w2k/cookie.json, shaped
 * { name, value }), and the win2k cube toggled on if it is not already. A check
 * imports `page` for its own evaluate calls, calls `openSession()` when it needs
 * a transcript on screen, and closes `browser` when it is done. Playwright comes
 * from DSH_PLAYWRIGHT when that names an installed copy. See tools/README.md.
 */
const { chromium } = await import(process.env.DSH_PLAYWRIGHT ?? 'playwright')
import { readFileSync } from 'node:fs'

const cookie = JSON.parse(readFileSync(process.env.DSH_COOKIE ?? '/tmp/w2k/cookie.json','utf8'))
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } })
await ctx.addCookies([{ name: cookie.name, value: cookie.value, domain: '127.0.0.1', path: '/' }])
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3500)
if (!(await page.evaluate(() => document.body.hasAttribute('data-dsw-win2k')))) {
  await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1500)
  await page.getByText('Windows 2000', { exact: false }).first().click(); await page.waitForTimeout(1000)
  await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
}

// The class-name reader every page-side scan uses: one class per part, the
// CSS-module hash stripped. Installed on the page because an `evaluate`
// callback is serialized without its module scope, so it cannot close over this
// file's own `local`.
await page.evaluate(() => {
  window.local = (el) => (el && typeof el.className === 'string'
    ? String(el.className).split(/\s+/).map((c) => c.replace(/^[A-Za-z0-9]+[_-]/, '')).join('.')
    : '')
})

/** Open the first session the sidebar offers and wait for its transcript. */
export async function openSession() {
  for (const row of await page.locator('[role="treeitem"]').all()) {
    const text = ((await row.textContent()) || '').trim()
    if (!text || /New Session/.test(text)) continue
    await row.click().catch(() => {})
    await page.waitForTimeout(2600)
    if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
  }
}

export { page, browser }
