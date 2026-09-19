/**
 * Audit: clipped or overflowing content
 *
 * Finds text a box cannot show (scrollWidth/scrollHeight beyond the client box
 * without an ellipsis), and children whose box escapes their parent's on the right
 * or bottom by more than a pixel — the shape of the "out of bounds" defects.
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
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
await openSession()
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
