/**
 * Audit: conformance
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

await openSession()
// the doc's metric table, as a check
const SPEC = [
  ['push button', '[class*="newSession"]', 23, null],
  ['tool row', '[data-variant]', 24, null],
  ['tree row', '[class*="projectRow"], [class*="sessionRow"]', 22, null],
  ['tab (unselected)', '[role="tab"][aria-selected="false"]', 22, null],
  ['tab (selected)', '[role="tab"][aria-selected="true"]', 23, null],
  ['caption bar', 'header:has([data-conversation-header-leading]) > div:first-child', 20, null],
  ['caption control', 'header:has([data-conversation-header-leading]) > div:first-child button', 16, 11],
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
  const stepper = document.querySelector('[class*="stepper"]')
  for (const [name, el, wantH, wantFs] of [['dialog combo', combo, 22, 12], ['dialog close', close, 22, 12], ['rail cell', navCell, 40, 12], ['stepper', stepper, 22, null]]) {
    if (!el) { out.push({ name, missing: true }); continue }
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el)
    out.push({ name, h: Math.round(r.height), fs: cs.fontSize, okH: wantH === null || Math.round(r.height) === wantH, okFs: wantFs === null || parseFloat(cs.fontSize) === wantFs })
  }
  return out
})
for (const r of dlg) console.log(r.missing ? `${r.name}: MISSING` : `${r.okH && r.okFs ? 'OK  ' : 'FAIL'} ${r.name}: h=${r.h} fs=${r.fs}`)
// the checkbox lives on the Agent presets page
const measureCheckbox = () => page.evaluate(() => {
  const el = document.querySelector('[role="switch"], input[type="checkbox"]')
  return el ? Math.round(el.getBoundingClientRect().height) : null
})
let box = await measureCheckbox()
if (box === null) {
  await page.locator('[role="dialog"] button, [role="dialog"] [role="tab"]').filter({ hasText: 'Agent presets' }).first().click().catch(() => {})
  await page.waitForTimeout(1500)
  box = await measureCheckbox()
}
console.log(`${box === 13 ? 'OK  ' : box === null ? 'SKIP' : 'FAIL'} checkbox/switch: ${box ?? 'none on the page'}px${box === null ? '' : ' (want 13)'}`)
const scrollbar = await page.evaluate(() => {
  const el = [...document.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 40 && e.offsetWidth > e.clientWidth)
  return el ? el.offsetWidth - el.clientWidth : null
})
console.log(`${scrollbar === 16 ? 'OK  ' : scrollbar === null ? 'SKIP' : 'FAIL'} scrollbar: ${scrollbar ?? 'none on screen'}px${scrollbar === null ? '' : '(want 16)'}`)
await browser.close()
