/**
 * Audit: doubled edges and stray radii
 *
 * A win2k control has one edge. This flags a control that carries both a border
 * and an inset bevel — two edges, which is how the Models page's buttons and the
 * add tiles looked wrong — and any element that still has a border radius, since
 * the shell had none.
 *
 * Fields are exempt from the border half: a win2k text field or combo is a white
 * face inside a 1px sunken border, and that border IS its edge.
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
    const doubled = new Map(), radii = new Map()
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 6 || cs.visibility === 'hidden' || cs.display === 'none') continue
      if (cs.borderRadius !== '0px' && cs.borderRadius !== '') {
        const key = `RADIUS ${cs.borderRadius} .${local(el).slice(0, 22) || el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 14)}"`
        radii.set(key, (radii.get(key) ?? 0) + 1)
      }
      const bw = Math.max(parseFloat(cs.borderTopWidth), parseFloat(cs.borderLeftWidth), parseFloat(cs.borderRightWidth), parseFloat(cs.borderBottomWidth))
      const bevelled = /inset/.test(cs.boxShadow)
      if (bw <= 0 || !bevelled) continue
      const tag = el.tagName.toLowerCase()
      if (tag === 'input' || tag === 'select' || tag === 'textarea') continue // a field's border is its edge
      const key = `DOUBLE-EDGE ${bw}px border + inset bevel .${local(el).slice(0, 22) || tag} "${(el.textContent || '').trim().slice(0, 16)}"`
      doubled.set(key, (doubled.get(key) ?? 0) + 1)
    }
    return { doubled: [...doubled.entries()].slice(0, 8), radii: [...radii.entries()].slice(0, 8) }
  })
  console.log(`--- ${label}: ${out.doubled.length} double-edged, ${out.radii.length} rounded ---`)
  for (const [k, n] of out.doubled) console.log(String(n).padStart(3), k)
  for (const [k, n] of out.radii) console.log(String(n).padStart(3), k)
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
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
