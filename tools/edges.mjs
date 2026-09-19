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
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
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
await openSession()
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
