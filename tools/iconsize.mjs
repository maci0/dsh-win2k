/**
 * Audit: iconsize
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
    const odd = new Map()
    for (const el of document.querySelectorAll('svg')) {
      const cs = getComputedStyle(el)
      const bi = cs.backgroundImage
      if (bi === 'none') continue
      const isBitmap = bi.includes('image/png')
      const r = el.getBoundingClientRect()
      if (r.width < 2 || r.height < 2) continue
      const w = +r.width.toFixed(2), h = +r.height.toFixed(2)
      const fractional = Math.abs(w - Math.round(w)) > 0.01 || Math.abs(h - Math.round(h)) > 0.01
      // what size did the rule ask for
      const m = cs.backgroundSize.match(/([\d.]+)px\s+([\d.]+)px/)
      const asked = m ? `${m[1]}x${m[2]}` : 'auto'
      if (!fractional && w === Number(m ? m[1] : w) && h === Number(m ? m[2] : h)) continue
      odd.set(`${w}x${h} asked=${asked} ${isBitmap ? 'png' : 'svg'} .${local(el.parentElement).slice(0, 20)}`, (odd.get(`${w}x${h} asked=${asked} ${isBitmap ? 'png' : 'svg'} .${local(el.parentElement).slice(0, 20)}`) ?? 0) + 1)
    }
    return [...odd.entries()].slice(0, 12)
  })
  console.log(`--- ${label} (${out.length}) ---`)
  for (const [k, n] of out) console.log(String(n).padStart(3), k)
}
await openSession()
await scan('session')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
await page.getByText('Trajectory', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(1500)
await scan('trajectory')
await browser.close()
