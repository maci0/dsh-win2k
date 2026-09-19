/**
 * Audit: fontaudit
 *
 * Run against a live `dsh web` at http://127.0.0.1:3080 with this plugin
 * enabled. Needs a Playwright chromium and an auth cookie in the file named by
 * DSH_COOKIE (default /tmp/w2k/cookie.json), shaped { name, value }.
 * See tools/README.md.
 */
import { chromium } from 'playwright'
import { readFileSync } from 'node:fs'
const cookie = JSON.parse(readFileSync(process.env.DSH_COOKIE ?? '/tmp/w2k/cookie.json','utf8'))
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } })
await ctx.addCookies([{ name: cookie.name, value: cookie.value, domain: '127.0.0.1', path: '/' }])
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3000)
if (!(await page.evaluate(() => document.body.hasAttribute('data-dsw-win2k')))) {
  await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1400)
  await page.getByText('Windows 2000', { exact: false }).first().click(); await page.waitForTimeout(1000)
  await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
}
const scan = async (label) => {
  const out = await page.evaluate(() => {
    const local = (el) => el && typeof el.className === 'string' ? String(el.className).split(/\s+/).map(c => c.replace(/^[A-Za-z0-9]+[_-]/, '')).join('.') : ''
    const bad = new Map()
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      const text = (el.textContent || '').trim()
      if (!text) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const fam = getComputedStyle(el).fontFamily
      if (/^"?Win2k (UI|Tahoma|Mono)"/.test(fam)) continue
      const key = `"${text.slice(0, 16)}" .${local(el).slice(0, 20)} -> ${fam.slice(0, 46)}`
      bad.set(key, (bad.get(key) ?? 0) + 1)
    }
    return [...bad.entries()]
  })
  console.log(`--- ${label} (${out.length} foreign) ---`)
  for (const [k, n] of out.slice(0, 14)) console.log(String(n).padStart(3), k)
}
await scan('hero')
const rows = await page.locator('[role="treeitem"]').all()
for (const r of rows) {
  const t = ((await r.textContent()) || '').trim()
  if (!t || /New Session/.test(t)) continue
  await r.click().catch(() => {})
  await page.waitForTimeout(2600)
  if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
}
await scan('session')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
await page.getByText('Plugins', { exact: true }).first().click(); await page.waitForTimeout(1800)
await scan('plugins')
await page.getByText('Trajectory', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1500)
await scan('trajectory')
await browser.close()
