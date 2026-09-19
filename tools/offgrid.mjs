/**
 * Audit: offgrid
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
await page.waitForTimeout(3200)
if (!(await page.evaluate(() => document.body.hasAttribute('data-dsw-win2k')))) {
  await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1400)
  await page.getByText('Windows 2000', { exact: false }).first().click(); await page.waitForTimeout(1000)
  await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
}
const OFF = new Set([3, 5, 9, 11, 13, 14, 15, 18, 22, 26, 28, 30])
const scan = async (label) => {
  const out = await page.evaluate((off) => {
    const OFF = new Set(off)
    const local = (el) => el && typeof el.className === 'string' ? String(el.className).split(/\s+/).map(c => c.replace(/^[A-Za-z0-9]+[_-]/, '')).join('.') : ''
    const seen = new Map()
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8 || r.y < -2000) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const parts = { pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft], mar: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft], gap: [cs.rowGap, cs.columnGap] }
      for (const [prop, values] of Object.entries(parts)) {
        for (const [i, v] of values.entries()) {
          const n = Math.round(parseFloat(v))
          if (!OFF.has(n)) continue
          const side = prop === 'pad' ? ['top', 'right', 'bottom', 'left'][i] : prop === 'mar' ? ['top', 'right', 'bottom', 'left'][i] : (i === 0 ? 'row' : 'col')
          const key = `${prop}-${side}=${n} .${local(el).slice(0, 24)}`
          if (!seen.has(key)) seen.set(key, `${(el.textContent || '').trim().slice(0, 18)}`)
        }
      }
    }
    return [...seen.entries()]
  }, [...OFF])
  console.log(`### ${label}: ${out.length}`)
  for (const [k, v] of out.slice(0, 40)) console.log('  ', k, '|', v)
}
const rows = await page.locator('[role="treeitem"]').all()
for (const r of rows) {
  const t = ((await r.textContent()) || '').trim()
  if (!t || /New Session/.test(t)) continue
  await r.click().catch(() => {})
  await page.waitForTimeout(2600)
  if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
}
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await browser.close()
