/**
 * Audit: spacing
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
    const hist = new Map()
    const num = (v) => Math.round(parseFloat(v))
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width < 8 || r.height < 8 || r.y < -2000) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none') continue
      const parts = {
        pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
        mar: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft],
        gap: [cs.rowGap, cs.columnGap],
      }
      for (const [prop, values] of Object.entries(parts)) {
        for (const v of values) {
          const n = num(v)
          if (!isFinite(n) || n === 0) continue
          const key = `${prop}=${n}`
          if (!hist.has(key)) hist.set(key, { n: 0, sample: `${local(el).slice(0, 22)} "${(el.textContent || '').trim().slice(0, 14)}"` })
          hist.get(key).n++
        }
      }
    }
    return [...hist.entries()]
  })
  console.log(`### ${label}`)
  const byProp = {}
  for (const [k, v] of out) { const [p, n] = k.split('='); (byProp[p] ||= []).push([Number(n), v.n, v.sample]) }
  for (const p of ['pad', 'mar', 'gap']) {
    const rows = (byProp[p] || []).sort((a, b) => a[0] - b[0])
    console.log(` ${p}: ` + rows.map(([v, n]) => `${v}(${n})`).join(' '))
  }
}
await openSession()
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click(); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
