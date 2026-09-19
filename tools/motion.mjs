/**
 * Audit: motion
 *
 * Windows 2000 had none — no transitions, no fades, no easing. This lists every element
 * that still has a non-zero transition or a running animation, with its duration and
 * iteration count, so each one can be justified or removed. The caret blink is the one
 * animation the shell did have.
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
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
await openSession()
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
