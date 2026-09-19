/**
 * Audit: type scale and border widths, in the views the other checks skip
 *
 * offgrid.mjs covers the shell's spacing and edges.mjs the borders of chat, settings and
 * the plugins page. This walks the trajectory and every settings subpage looking for
 * type off the sheet's scale (11, 12, 13, 14, 16, 20, 26) and for fractional border
 * widths, which a 1px shell never had. It found the trajectory's 10px kind tags, its
 * 8px turn label and 18px settings headings, none of which the live sweeps reached.
 *
 * Run against a live `dsh web` at http://127.0.0.1:3080 with this plugin enabled.
 * Needs a Playwright chromium and an auth cookie in the file named by DSH_COOKIE
 * (default /tmp/w2k/cookie.json), shaped { name, value }. See tools/README.md.
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
const scan = async (label) => {
  const out = await page.evaluate(() => {
    const local = (el) => el && typeof el.className === 'string' ? String(el.className).split(/\s+/).map(c => c.replace(/^[A-Za-z0-9]+[_-]/, '')).join('.') : ''
    const borders = new Map(), fonts = new Map()
    const scale = new Set(['11px', '12px', '13px', '14px', '16px', '20px', '26px'])
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
      if (r.width < 6 || r.height < 5 || cs.visibility === 'hidden' || cs.display === 'none') continue
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs['border' + side + 'Width'])
        if (w > 0 && !Number.isInteger(w)) borders.set(`BORDER ${cs['border' + side + 'Width']} .${local(el).slice(0, 20) || el.tagName.toLowerCase()}`, 1)
      }
      if (el.children.length === 0 && (el.textContent || '').trim() && r.width > 8 && r.height > 6 && !scale.has(cs.fontSize)) {
        const key = `FONT ${cs.fontSize} .${local(el).slice(0, 20) || el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 12)}"`
        fonts.set(key, (fonts.get(key) ?? 0) + 1)
      }
    }
    return { borders: [...borders.keys()].slice(0, 6), fonts: [...fonts.entries()].slice(0, 6) }
  })
  console.log(`--- ${label}: ${out.borders.length} fractional borders, ${out.fonts.length} off-scale sizes`)
  for (const b of out.borders) console.log('  ', b)
  for (const [k, n] of out.fonts) console.log(String(n).padStart(3), k)
}
const rows = await page.locator('[role="treeitem"]').all()
for (const r of rows) {
  const t = ((await r.textContent()) || '').trim()
  if (!t || /New Session/.test(t)) continue
  await r.click().catch(() => {})
  await page.waitForTimeout(2600)
  if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
}
await page.getByText('Trajectory', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(1800)
await scan('trajectory')
await page.getByText('Chat', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(1200)
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1800)
for (const nav of ['Models', 'Built-in plugins', 'Agent presets', 'Archived sessions']) {
  await page.locator('[role="dialog"] button, [role="dialog"] [role="tab"]').filter({ hasText: nav }).first().click().catch(() => {})
  await page.waitForTimeout(1500)
  await scan(`settings/${nav}`)
}
await browser.close()
