/**
 * Audit: clipped or overflowing content
 *
 * Finds text a box cannot show (scrollWidth/scrollHeight beyond the client box
 * without an ellipsis), and children whose box escapes their parent's on the right
 * or bottom by more than a pixel — the shape of the "out of bounds" defects.
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
    const clipped = new Map(); const escaping = new Map()
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 6 || r.y < -3000) continue
      // text the box cannot show, with no ellipsis to say so
      const ownText = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
      // an ancestor's ellipsis covers this element too: it is truncated, not clipped
      let covered = cs.textOverflow === 'ellipsis'
      for (let n = el.parentElement, i = 0; n && i < 8; n = n.parentElement, i++) {
        if (getComputedStyle(n).textOverflow === 'ellipsis') { covered = true; break }
      }
      if (ownText && !covered) {
        if (el.scrollWidth > el.clientWidth + 1) {
          const key = `CLIPPED tf=${cs.textOverflow} ov=${cs.overflow} w=${el.clientWidth} need=${el.scrollWidth} .${String(el.className).slice(0, 30) || el.tagName.toLowerCase()} \"${(el.textContent || '').trim().slice(0, 18)}\"`
          clipped.set(key, (clipped.get(key) ?? 0) + 1)
        }
        if (el.scrollHeight > el.clientHeight + 1 && cs.overflowY !== 'auto' && cs.overflowY !== 'scroll'
            && cs.webkitLineClamp === 'none') { // a clamp is a deliberate truncation, and it ellipsizes
          const key = `CLIPPED-V h=${el.clientHeight} need=${el.scrollHeight} .${local(el).slice(0, 22) || el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 18)}"`
          clipped.set(key, (clipped.get(key) ?? 0) + 1)
        }
      }
      // a child escaping its parent's box
      const p = el.parentElement
      if (!p) continue
      // an ancestor that clips means it does not visibly escape
      let clippedByAncestor = false
      for (let n = p, i = 0; n && i < 3; n = n.parentElement, i++) {
        const ncs = getComputedStyle(n)
        if (ncs.overflow !== 'visible' || ncs.overflowX !== 'visible' || ncs.overflowY !== 'visible') { clippedByAncestor = true; break }
      }
      if (clippedByAncestor) continue
      const pr = p.getBoundingClientRect()
      if (pr.width < 8) continue
      // deliberate bleed: a negative margin, or a decoration that takes no pointer
      if (parseFloat(cs.marginLeft) < 0 || parseFloat(cs.marginRight) < 0) continue
      if (cs.pointerEvents === 'none') continue
      // known decorations: the lightbox's frame and mark are drawn to sit outside
      // their slot on purpose. Add here only with a reason. The CSS-module hash
      // in front of the local name changes on every client build, so only the
      // local name is matched.
      if (/(?:^|\s)[^\s]*_(?:frame|mark)\b/.test(String(el.className))) continue
      const overRight = r.right - pr.right
      const overBottom = r.bottom - pr.bottom
      if (overRight > 2 || overBottom > 2) {
        const key = `ESCAPES ${overRight > 2 ? `right+${Math.round(overRight)}` : ''}${overBottom > 2 ? ` bottom+${Math.round(overBottom)}` : ''} .${local(el).slice(0, 20) || el.tagName.toLowerCase()} in .${local(p).slice(0, 18) || p.tagName.toLowerCase()}`
        escaping.set(key, (escaping.get(key) ?? 0) + 1)
      }
    }
    return { clipped: [...clipped.entries()].slice(0, 8), escaping: [...escaping.entries()].slice(0, 8) }
  })
  console.log(`--- ${label}: ${out.clipped.length} clipped, ${out.escaping.length} escaping ---`)
  for (const [k, n] of out.clipped) console.log(String(n).padStart(3), k)
  for (const [k, n] of out.escaping) console.log(String(n).padStart(3), k)
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
