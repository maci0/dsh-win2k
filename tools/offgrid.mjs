/**
 * Audit: offgrid
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const OFF = new Set([3, 5, 9, 11, 13, 14, 15, 18, 22, 26, 28, 30])
const scan = async (label) => {
  const out = await page.evaluate((off) => {
    const OFF = new Set(off)
    const seen = new Map()
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8 || r.y < -2000) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const parts = { pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft], mar: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft], gap: [cs.rowGap, cs.columnGap] }
      for (const [prop, values] of Object.entries(parts)) {
        for (const [i, v] of values.entries()) {
          const n = Math.round(parseFloat(v))
          if (!OFF.has(n)) continue
          const side = prop === 'pad' ? ['top', 'right', 'bottom', 'left'][i] : prop === 'mar' ? ['top', 'right', 'bottom', 'left'][i] : (i === 0 ? 'row' : 'col')
          const key = `${prop}-${side}=${n} .${local(el).slice(0, 24)}`
          if (!seen.has(key)) seen.set(key, `${(el.textContent || '').trim().slice(0, 18)}`)
        }
      }
    }
    return [...seen.entries()]
  }, [...OFF])
  console.log(`### ${label}: ${out.length}`)
  for (const [k, v] of out.slice(0, 40)) console.log('  ', k, '|', v)
}
await openSession()
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await browser.close()
