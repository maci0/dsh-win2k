/**
 * Audit: motion
 *
 * Windows 2000 had none — no transitions, no fades, no easing. This lists every element
 * that still has a non-zero transition or a running animation, with its duration and
 * iteration count, so each one can be justified or removed. The caret blink is the one
 * animation the shell did have.
 *
 * Run against a live `dsh web` at http://127.0.0.1:3080 with this plugin enabled.
 * Needs a Playwright chromium and an auth cookie in the file named by DSH_COOKIE
 * (default /tmp/w2k/cookie.json), shaped { name, value }. See tools/README.md.
 */
const { chromium } = await import(process.env.DSH_PLAYWRIGHT ?? 'playwright')
import { readFileSync } from 'node:fs'
const cookie = JSON.parse(readFileSync(process.env.DSH_COOKIE ?? '/tmp/w2k/cookie.json','utf8'))
const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1680, height: 1000 } })
await ctx.addCookies([{ name: cookie.name, value: cookie.value, domain: '127.0.0.1', path: '/' }])
const page = await ctx.newPage()
await page.goto('http://127.0.0.1:3080/', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(3500)
if (!(await page.evaluate(() => document.body.hasAttribute('data-dsw-win2k')))) {
  await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1500)
  await page.getByText('Windows 2000', { exact: false }).first().click(); await page.waitForTimeout(1000)
  await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
}
const scan = async (label) => {
  const out = await page.evaluate(() => {
    const local = (el) => el && typeof el.className === 'string' ? String(el.className).split(/\s+/).map(c => c.replace(/^[A-Za-z0-9]+[_-]/, '')).join('.') : ''
    const trans = new Map(), anim = new Map()
    for (const el of document.querySelectorAll('*')) {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (r.width < 4 || r.height < 4 || cs.visibility === 'hidden' || cs.display === 'none') continue
      const ds = cs.transitionDuration.split(',').map(s => parseFloat(s))
      if (ds.some(d => d > 0.001) || cs.transitionProperty !== 'all' && parseFloat(cs.transitionDuration) > 0.001) {
        const key = `TRANSITION ${cs.transitionDuration} ${cs.transitionProperty.slice(0, 24)} .${local(el).slice(0, 20) || el.tagName.toLowerCase()}`
        trans.set(key, (trans.get(key) ?? 0) + 1)
      }
      if (cs.animationName !== 'none') {
        const key = `ANIMATION ${cs.animationName} ${cs.animationDuration} ${cs.animationIterationCount} .${local(el).slice(0, 20) || el.tagName.toLowerCase()}`
        anim.set(key, (anim.get(key) ?? 0) + 1)
      }
    }
    return { trans: [...trans.entries()].slice(0, 10), anim: [...anim.entries()].slice(0, 10) }
  })
  console.log(`--- ${label}: ${out.trans.length} transitions, ${out.anim.length} animations ---`)
  for (const [k, n] of out.trans) console.log(String(n).padStart(3), k)
  for (const [k, n] of out.anim) console.log(String(n).padStart(3), k)
}
const rows = await page.locator('[role="treeitem"]').all()
for (const r of rows) {
  const t = ((await r.textContent()) || '').trim()
  if (!t || /New Session/.test(t)) continue
  await r.click().catch(() => {})
  await page.waitForTimeout(2600)
  if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
}
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
