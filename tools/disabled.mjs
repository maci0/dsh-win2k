/**
 * Audit: does every disabled control look disabled?
 *
 * A win2k disabled control carries an etched grey label; it is not faded. This sheet
 * forces opacity 1 on disabled elements so the etch is the only signal, which makes
 * it worth checking that every one of them actually has it.
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scan = async (label) => {
  const out = await page.evaluate(() => {
    const rows = []
    for (const el of document.querySelectorAll(':disabled, [aria-disabled="true"]')) {
      const cs = getComputedStyle(el)
      const r = el.getBoundingClientRect()
      if (r.width < 6 || r.height < 6 || cs.visibility === 'hidden') continue
      // the caption's title is a disabled control by construction and carries white ink
      // on the ActiveTitle band; its colour is the point of the band, not a state
      if (el.closest('header:has([data-conversation-header-leading])')) continue
      // the etched grey is #808080; anything near black reads as enabled
      const m = cs.color.match(/rgb\((\d+), (\d+), (\d+)/)
      const [rr, gg, bb] = m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [0, 0, 0]
      const etched = rr > 90 && rr < 190 && Math.abs(rr - gg) < 12 && Math.abs(gg - bb) < 12
      rows.push({ cls: local(el).slice(0, 24) || el.tagName.toLowerCase(), text: (el.textContent || '').trim().slice(0, 16), color: cs.color, opacity: cs.opacity, etched })
    }
    return rows
  })
  const bad = out.filter(r => !r.etched)
  console.log(`--- ${label}: ${out.length} disabled, ${bad.length} not etched ---`)
  for (const b of bad.slice(0, 8)) console.log(`   ${b.cls} "${b.text}" color=${b.color} opacity=${b.opacity}`)
}
await openSession()
await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await browser.close()
