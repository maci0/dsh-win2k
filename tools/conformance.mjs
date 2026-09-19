/**
 * Audit: conformance
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
await page.waitForTimeout(3500)
if (!(await page.evaluate(() => document.body.hasAttribute('data-dsw-win2k')))) {
  await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1500)
  await page.getByText('Windows 2000', { exact: false }).first().click(); await page.waitForTimeout(1000)
  await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
}
const rows = await page.locator('[role="treeitem"]').all()
for (const r of rows) {
  const t = ((await r.textContent()) || '').trim()
  if (!t || /New Session/.test(t)) continue
  await r.click().catch(() => {})
  await page.waitForTimeout(2600)
  if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
}
// the doc's metric table, as a check
const SPEC = [
  ['push button', '[class*="newSession"]', 23, null],
  ['tool row', '[data-variant]', 24, null],
  ['tree row', '[class*="projectRow"], [class*="sessionRow"]', 22, null],
  ['tab', '[role="tab"]', 22, null],
  ['caption bar', 'header:has([data-conversation-header-leading]) > div:first-child', 20, null],
  ['caption control', 'header:has([data-conversation-header-leading]) > div:first-child button', 18, 11],
  ['status bar', '[class*="_dock"]:not([data-goal-bar])', null, 11],
  ['toolbar chip', '[class*="composerStack"] [class*="trigger"]', 22, 12],
]
const chat = await page.evaluate((spec) => {
  const out = []
  for (const [name, sel, h, fs] of spec) {
    const el = document.querySelector(sel)
    if (!el) { out.push({ name, missing: true }); continue }
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    out.push({ name, h: Math.round(r.height), fs: cs.fontSize, wantH: h, wantFs: fs,
      okH: h === null || Math.round(r.height) === h, okFs: fs === null || parseFloat(cs.fontSize) === fs })
  }
  return out
}, SPEC)
for (const r of chat) console.log(r.missing ? `${r.name}: MISSING` : `${r.okH && r.okFs ? 'OK  ' : 'FAIL'} ${r.name}: h=${r.h}${r.wantH ? `(want ${r.wantH})` : ''} fs=${r.fs}${r.wantFs ? `(want ${r.wantFs})` : ''}`)
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
const dlg = await page.evaluate(() => {
  const out = []
  const push = document.querySelector('[role="dialog"] [class*="row"] ~ * button, [role="dialog"] button')
  const combo = document.querySelector('[role="dialog"] [class*="selector"]')
  const close = document.querySelector('[role="dialog"] [class*="close"]')
  const navCell = document.querySelector('[role="dialog"] [class*="navCell"]')
  for (const [name, el, wantH, wantFs] of [['dialog combo', combo, 22, 12], ['dialog close', close, 22, 12], ['rail cell', navCell, 40, 12]]) {
    if (!el) { out.push({ name, missing: true }); continue }
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    out.push({ name, h: Math.round(r.height), fs: cs.fontSize, okH: wantH === null || Math.round(r.height) === wantH, okFs: wantFs === null || parseFloat(cs.fontSize) === wantFs })
  }
  return out
})
for (const r of dlg) console.log(r.missing ? `${r.name}: MISSING` : `${r.okH && r.okFs ? 'OK  ' : 'FAIL'} ${r.name}: h=${r.h} fs=${r.fs}`)
await browser.close()
