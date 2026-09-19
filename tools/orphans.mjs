/**
 * Audit: glyphs hidden without a replacement
 *
 * The sheet paints icons by hiding an svg's children and putting a bitmap on the svg
 * itself. If a rule hides the children and nothing sets a background image, the
 * control renders an empty box — the shape of the blank copy plate. This finds any
 * svg left in that state.
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
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
  const count = out.reduce((total, [, hits]) => total + hits, 0)
  console.log(`--- ${label}: ${count} orphaned glyphs ---`)
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
