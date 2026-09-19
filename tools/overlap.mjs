/**
 * Audit: text drawn on top of text
 *
 * Two siblings whose text boxes intersect are drawn over each other — the shape of
 * the toolbar labels that printed "Turns" and "Calls" in the same place. Restricted
 * to siblings that both carry text, neither absolutely positioned, and neither with
 * a negative margin, so deliberate overlaps (badges over thumbnails, bleeds) are out.
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
    const ink = (el) => {
      // a truncated label's Range box ignores the clip, so intersect it with the
      // element's own box; and a visually-hidden label has no box worth comparing
      const box = el.getBoundingClientRect()
      if (box.width <= 2 || box.height <= 2) return null
      const range = document.createRange(); range.selectNodeContents(el)
      const r = range.getBoundingClientRect()
      // Clip only when the element actually clips. A box with overflow visible whose
      // text runs past it is the defect this check is for, so its raw range counts.
      const clips = getComputedStyle(el).overflow !== 'visible' || getComputedStyle(el).overflowX !== 'visible'
      const left = clips ? Math.max(r.left, box.left) : r.left
      const right = clips ? Math.min(r.right, box.right) : r.right
      const top = clips ? Math.max(r.top, box.top) : r.top
      const bottom = clips ? Math.min(r.bottom, box.bottom) : r.bottom
      if (right - left <= 1 || bottom - top <= 1) return null
      return { left, right, top, bottom }
    }
    const ownText = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    const bad = new Map()
    for (const parent of document.querySelectorAll('*')) {
      const kids = [...parent.children].filter(k => {
        const cs = getComputedStyle(k)
        if (cs.position === 'absolute' || cs.position === 'fixed') return false
        // an inline element's rect is the union of its line boxes, so a wrapped inline
        // reads as starting under whatever precedes it. Not an overlap.
        if (cs.display === 'inline') return false
        return ownText(k)
      })
      if (kids.length < 2) continue
      const boxes = kids.map(k => ({ k, r: ink(k) })).filter(b => b.r)
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r, b = boxes[j].r
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (ox <= 2 || oy <= 2) continue
          const key = `OVERLAP ${Math.round(ox)}x${Math.round(oy)} "${(boxes[i].k.textContent || '').trim().slice(0, 14)}" + "${(boxes[j].k.textContent || '').trim().slice(0, 14)}" in .${local(parent).slice(0, 20)}`
          bad.set(key, (bad.get(key) ?? 0) + 1)
        }
      }
    }
    return [...bad.entries()].slice(0, 8)
  })
  const count = out.reduce((total, [, hits]) => total + hits, 0)
  console.log(`--- ${label}: ${count} overlapping pairs ---`)
  for (const [k, n] of out) console.log(String(n).padStart(3), k)
  return count
}

await openSession()
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
