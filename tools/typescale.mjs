/**
 * Audit: type scale and border widths, in the views the other checks skip
 *
 * offgrid.mjs covers the shell's spacing and edges.mjs the borders of chat, settings and
 * the plugins page. This walks the trajectory and every settings subpage looking for
 * type off the sheet's scale (11, 12, 13, 14, 16, 20, 26) and for fractional border
 * widths, which a 1px shell never had. It found the trajectory's 10px kind tags, its
 * 8px turn label and 18px settings headings, none of which the live sweeps reached.
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
    const borders = new Map(), fonts = new Map()
    const scale = new Set(['11px', '12px', '13px', '14px', '16px', '20px', '26px'])
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el); const r = el.getBoundingClientRect()
      if (r.width < 6 || r.height < 5 || cs.visibility === 'hidden' || cs.display === 'none') continue
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
        const w = parseFloat(cs['border' + side + 'Width'])
        if (w > 0 && !Number.isInteger(w)) borders.set(`BORDER ${cs['border' + side + 'Width']} .${local(el).slice(0, 20) || el.tagName.toLowerCase()}`, 1)
      }
      if (el.children.length === 0 && (el.textContent || '').trim() && r.width > 8 && r.height > 6 && !scale.has(cs.fontSize)) {
        const key = `FONT ${cs.fontSize} .${local(el).slice(0, 20) || el.tagName.toLowerCase()} "${(el.textContent || '').trim().slice(0, 12)}"`
        fonts.set(key, (fonts.get(key) ?? 0) + 1)
      }
    }
    return { borders: [...borders.keys()].slice(0, 6), fonts: [...fonts.entries()].slice(0, 6) }
  })
  console.log(`--- ${label}: ${out.borders.length} fractional borders, ${out.fonts.length} off-scale sizes`)
  for (const b of out.borders) console.log('  ', b)
  for (const [k, n] of out.fonts) console.log(String(n).padStart(3), k)
}
await openSession()
await page.getByText('Trajectory', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(1800)
await scan('trajectory')
await page.getByText('Chat', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(1200)
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1800)
for (const nav of ['Models', 'Built-in plugins', 'Agent presets', 'Archived sessions']) {
  await page.locator('[role="dialog"] button, [role="dialog"] [role="tab"]').filter({ hasText: nav }).first().click().catch(() => {})
  await page.waitForTimeout(1500)
  await scan(`settings/${nav}`)
}
await browser.close()
