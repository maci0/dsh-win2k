/**
 * Audit: does every disabled control look disabled?
 *
 * A win2k disabled control carries an etched grey label; it is not faded. This sheet
 * forces opacity 1 on disabled elements so the etch is the only signal, which makes
 * it worth checking that every one of them actually has it.
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
    const rows = []
    for (const el of document.querySelectorAll(':disabled, [aria-disabled="true"]')) {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (r.width < 6 || r.height < 6 || cs.visibility === 'hidden') continue
      // the caption's title is a disabled control by construction and carries white ink
      // on the ActiveTitle band; its colour is the point of the band, not a state
      if (el.closest('header:has([data-conversation-header-leading])')) continue
      // the etched grey is #808080; anything near black reads as enabled
      const m = cs.color.match(/rgb\((\d+), (\d+), (\d+)/)
      const [rr, gg, bb] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
      const etched = rr > 90 && rr < 190 && Math.abs(rr - gg) < 12 && Math.abs(gg - bb) < 12
      rows.push({ cls: local(el).slice(0, 24) || el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 16), color: cs.color, opacity: cs.opacity, etched })
    }
    return rows
  })
  const bad = out.filter(r => !r.etched)
  console.log(`--- ${label}: ${out.length} disabled, ${bad.length} not etched ---`)
  for (const b of bad.slice(0, 8)) console.log(`   ${b.cls} "${b.text}" color=${b.color} opacity=${b.opacity}`)
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
