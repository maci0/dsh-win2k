/**
 * Audit: contrast
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
    const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(',').map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 } }
    const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05) }
    const bgOf = (el) => {
      let n = el
      while (n && n !== document.documentElement) {
        const c = parse(getComputedStyle(n).backgroundColor)
        if (c && c.a > 0.5) return c
        n = n.parentElement
      }
      return { r: 255, g: 255, b: 255, a: 1 }
    }
    const bad = new Map()
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      const text = (el.textContent || '').trim()
      if (!text) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const cs = getComputedStyle(el)
      if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) < 0.5) continue
      const fg = parse(cs.color)
      if (!fg || fg.a < 0.5) continue
      const bg = bgOf(el)
      const cr = ratio(fg, bg)
      if (cr < 3) {
        const key = `${Math.round(cr * 10) / 10}:1 .${local(el).slice(0, 20)} "${text.slice(0, 18)}" fg=${cs.color} bg=rgb(${bg.r},${bg.g},${bg.b})`
        bad.set(key, (bad.get(key) ?? 0) + 1)
      }
    }
    return [...bad.entries()]
  })
  console.log(`--- ${label} (${out.length} low-contrast) ---`)
  for (const [k, n] of out.slice(0, 12)) console.log(String(n).padStart(3), k)
}
await scan('hero')
await openSession()
await scan('session')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
await page.getByText('Plugins', { exact: true }).first().click(); await page.waitForTimeout(1800)
await scan('plugins')
await browser.close()
