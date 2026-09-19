/**
 * Audit: text drawn on top of text
 *
 * Two siblings whose text boxes intersect are drawn over each other — the shape of
 * the toolbar labels that printed "Turns" and "Calls" in the same place. Restricted
 * to siblings that both carry text, neither absolutely positioned, and neither with
 * a negative margin, so deliberate overlaps (badges over thumbnails, bleeds) are out.
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
    const ink = (el) => {
      // a truncated label's Range box ignores the clip, so intersect it with the
      // element's own box; and a visually-hidden label has no box worth comparing
      const box = el.getBoundingClientRect()
      if (box.width <= 2 || box.height <= 2) return null
      const range = document.createRange(); range.selectNodeContents(el)
      const r = range.getBoundingClientRect()
      // Clip only when the element actually clips. A box with overflow visible whose
      // text runs past it is the defect this check is for, so its raw range counts.
      const clips = getComputedStyle(el).overflow !== 'visible' || getComputedStyle(el).overflowX !== 'visible'
      const left = clips ? Math.max(r.left, box.left) : r.left
      const right = clips ? Math.min(r.right, box.right) : r.right
      const top = clips ? Math.max(r.top, box.top) : r.top
      const bottom = clips ? Math.min(r.bottom, box.bottom) : r.bottom
      if (right - left <= 1 || bottom - top <= 1) return null
      return { left, right, top, bottom }
    }
    const ownText = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    const bad = new Map()
    for (const parent of document.querySelectorAll('*')) {
      const kids = [...parent.children].filter(k => {
        const cs = getComputedStyle(k)
        if (cs.position === 'absolute' || cs.position === 'fixed') return false
        if (csrf(k)) return false
        return ownText(k)
      })
      if (kids.length < 2) continue
      const boxes = kids.map(k => ({ k, r: ink(k) })).filter(b => b.r)
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i].r, b = boxes[j].r
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
          if (ox <= 2 || oy <= 2) continue
          const key = `OVERLAP ${Math.round(ox)}x${Math.round(oy)} "${(boxes[i].k.textContent || '').trim().slice(0, 14)}" + "${(boxes[j].k.textContent || '').trim().slice(0, 14)}" in .${local(parent).slice(0, 20)}`
          bad.set(key, (bad.get(key) ?? 0) + 1)
        }
      }
    }
    return [...bad.entries()].slice(0, 8)
    function csrf(el) { return false }
  })
  console.log(`--- ${label}: ${out.length} overlapping pairs ---`)
  for (const [k, n] of out) console.log(String(n).padStart(3), k)
}
const rows = await page.locator('[role="treeitem"]').all()
for (const r of rows) {
  const t = ((await r.textContent()) || '').trim()
  if (!t || /New Session/.test(t)) continue
  await r.click().catch(() => {})
  await page.waitForTimeout(2600)
  if (await page.evaluate(() => document.querySelectorAll('[data-variant]').length > 0)) break
}
// --self-test reinjects the defect this check exists for — the toolbar toggles sized
// to a flat 22px so their labels print over each other — and asserts it is caught.
if (process.argv.includes('--self-test')) {
  await page.getByText('Trajectory', { exact: true }).first().click().catch(() => {})
  await page.waitForTimeout(1800)
  const before = await page.evaluate(() => document.querySelectorAll('[class*="action"]').length)
  await page.addStyleTag({ content: 'button[class*="action"]{width:22px !important;padding:0 !important}' })
  await page.waitForTimeout(600)
  const found = await page.evaluate(() => {
    const ownText = (el) => [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
    const ink = (el) => {
      const box = el.getBoundingClientRect()
      if (box.width <= 2 || box.height <= 2) return null
      const range = document.createRange(); range.selectNodeContents(el)
      const r = range.getBoundingClientRect()
      const clips = getComputedStyle(el).overflow !== 'visible' || getComputedStyle(el).overflowX !== 'visible'
      return clips
        ? { left: Math.max(r.left, box.left), right: Math.min(r.right, box.right), top: Math.max(r.top, box.top), bottom: Math.min(r.bottom, box.bottom) }
        : r
    }
    let n = 0
    for (const parent of document.querySelectorAll('*')) {
      const kids = [...parent.children].filter(k => ownText(k) && getComputedStyle(k).position !== 'absolute')
      if (kids.length < 2) continue
      const boxes = kids.map(ink).filter(b => b && b.width > 2 && b.height > 2)
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i], b = boxes[j]
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left)
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)
        if (ox > 2 && oy > 2) n++
      }
    }
    return n
  })
  console.log(`self-test: ${before} action buttons on screen, ${found} overlap(s) after reinjecting the bug`)
  console.log(found > 0 ? 'PASS — the check catches the defect it was written for' : 'FAIL — the check is blind to its own defect')
  await browser.close()
  process.exit(found > 0 ? 0 : 1)
}

await scan('chat+sidebar')
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(900)
await page.getByText('Plugins', { exact: true }).first().click().catch(() => {}); await page.waitForTimeout(1400)
await scan('plugins page')
await browser.close()
