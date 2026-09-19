/**
 * Audit: fontaudit
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
    const bad = new Map()
    for (const el of document.querySelectorAll('*')) {
      if (el.children.length) continue
      const text = (el.textContent || '').trim()
      if (!text) continue
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4) continue
      const fam = getComputedStyle(el).fontFamily
      if (/^"?Win2k (UI|Tahoma|Mono)"/.test(fam)) continue
      const key = `"${text.slice(0, 16)}" .${local(el).slice(0, 20)} -> ${fam.slice(0, 46)}`
      bad.set(key, (bad.get(key) ?? 0) + 1)
    }
    return [...bad.entries()]
  })
  console.log(`--- ${label} (${out.length} foreign) ---`)
  for (const [k, n] of out.slice(0, 14)) console.log(String(n).padStart(3), k)
}
await scan('hero')
await openSession()
await scan('session')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
await page.getByText('Plugins', { exact: true }).first().click(); await page.waitForTimeout(1800)
await scan('plugins')
await page.getByText('Trajectory', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1500)
await scan('trajectory')
await browser.close()
