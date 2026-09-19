/**
 * Audit: glyphs hidden without a replacement
 *
 * The sheet paints icons by hiding an svg's children and putting a bitmap on the svg
 * itself. If a rule hides the children and nothing sets a background image, the
 * control renders an empty box — the shape of the blank copy plate. This finds any
 * svg left in that state.
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
    const hits = new Map()
    for (const el of document.querySelectorAll('svg')) {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const r = el.getBoundingClientRect()
      if (r.width < 3 || r.height < 3) continue
      if (cs.backgroundImage !== 'none') continue            // painted: fine
      // the hide-and-paint pattern also paints the svg's parent (or grandparent),
      // which is how the message actions carry their glyph
      let paintedByAncestor = false
      for (let n = el.parentElement, i = 0; n && i < 2; n = n.parentElement, i++) {
        if (getComputedStyle(n).backgroundImage !== 'none') { paintedByAncestor = true; break }
      }
      if (paintedByAncestor) continue
      if (el.children.length === 0) continue                  // nothing hidden
      const allHidden = [...el.children].every(c => getComputedStyle(c).display === 'none')
      if (!allHidden) continue
      const key = `${Math.round(r.width)}x${Math.round(r.height)} svg in .${local(el.parentElement).slice(0, 22) || el.parentElement.tagName.toLowerCase()} "${(el.parentElement.textContent || '').trim().slice(0, 16)}"`
      hits.set(key, (hits.get(key) ?? 0) + 1)
    }
    return [...hits.entries()].slice(0, 8)
  })
  console.log(`--- ${label}: ${out.length} orphaned glyphs ---`)
  for (const [k, n] of out) console.log(String(n).padStart(3), k)
}
const rows = await page.locator('[role="treeitem"]').all()
for (const r of rows) {
  const t = ((await r.textContent()) || '').trim()
  if (!t || /New Session/.test(t)) continue
  await r.click().catch(() => {})
  await page.waitForTimeout(2600)
  if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
}
// --self-test removes the paint from a control whose children this sheet hides — the
// state the blank copy plate was in — and asserts the check catches it.
if (process.argv.includes('--self-test')) {
  const scanNow = () => page.evaluate(() => {
    let n = 0
    for (const el of document.querySelectorAll('svg')) {
      const cs = getComputedStyle(el)
      if (cs.display === 'none' || cs.backgroundImage !== 'none' || !el.children.length) continue
      if (![...el.children].every(c => getComputedStyle(c).display === 'none')) continue
      let painted = false
      for (let p = el.parentElement, i = 0; p && i < 2; p = p.parentElement, i++) if (getComputedStyle(p).backgroundImage !== 'none') { painted = true; break }
      if (!painted) n++
    }
    return n
  })
  const before = await scanNow()
  await page.addStyleTag({ content: 'button[aria-label="Copy"]{background-image:none !important;background:none !important}' })
  await page.waitForTimeout(400)
  const after = await scanNow()
  console.log(`self-test: ${before} orphaned before, ${after} after stripping the copy paint`)
  console.log(after > before ? 'PASS — the check catches a hidden glyph with no replacement' : 'FAIL — the check is blind to its own defect')
  await browser.close()
  process.exit(after > before ? 0 : 1)
}

await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
