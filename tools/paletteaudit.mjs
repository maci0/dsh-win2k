/**
 * Audit: paletteaudit
 *
 * See tools/README.md for the page, the auth cookie and the other checks.
 */
import { browser, openSession, page } from './_page.mjs'

const scanTokens = async (label) => {
  const out = await page.evaluate(() => {
    const cs = getComputedStyle(document.body)
    const bad = []
    for (const prop of cs) {
      if (!prop.startsWith('--dsw-')) continue
      const v = cs.getPropertyValue(prop).trim()
      const m = v.match(/rgba\(\d+, \d+, \d+, ([\d.]+)\)/) || v.match(/color\(srgb [\d.]+ [\d.]+ [\d.]+ \/ ([\d.]+)\)/)
      if (!m) continue
      const a = Number(m[1])
      if (a > 0.01 && a < 0.99 && !/mask/.test(prop)) bad.push(`${prop}=${v}`)
    }
    return bad
  })
  console.log(`--- ${label} tokens: ${out.length} translucent ---`)
  for (const b of out.slice(0, 6)) console.log('  ', b)
}
const scan = async (label) => {
  const out = await page.evaluate(() => {
    const parse = (c) => {
      let m = c.match(/rgba?\((\d+), (\d+), (\d+)/)
      if (m) return [Number(m[1]), Number(m[2]), Number(m[3])]
      m = c.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/)
      if (m) return m.slice(1, 4).map(x => Math.round(Number(x) * 255))
      return null
    }
    const hsl = ([r, g, b]) => {
      r /= 255; g /= 255; b /= 255
      const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
      let h = 0, s = 0
      if (max !== min) {
        const d = max - min
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
        h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
        h *= 60
      }
      return [h, s * 100, l * 100]
    }
    const offender = (rgb) => {
      const [h, s, l] = hsl(rgb)
      if (s < 30) return false                 // greys and near-greys are fine
      const known = [[166, 202, 240], [255, 255, 225], [212, 208, 200], [228, 225, 220], [192, 189, 182], [230, 228, 224], [244, 242, 220], [226, 239, 226]]
      const k = known.find(c => Math.abs(c[0] - rgb[0]) < 4 && Math.abs(c[1] - rgb[1]) < 4 && Math.abs(c[2] - rgb[2]) < 4)
      if (k) return false
      const purple = h >= 265 && h <= 335
      const bright = l > 55
      const orange = h > 20 && h < 40 && l > 55
      return purple || bright || orange
    }
    const alpha = (c) => {
      let m = c.match(/rgba\(\d+, \d+, \d+, ([\d.]+)\)/)
      if (m) return Number(m[1])
      m = c.match(/color\(srgb [\d.]+ [\d.]+ [\d.]+ \/ ([\d.]+)\)/)
      if (m) return Number(m[1])
      return 1
    }
    const maskish = (el) => /mask|overlay|backdrop|scrim|dim|shadow/i.test(String(el.className))
    const bad = new Map()
    for (const el of document.querySelectorAll('*')) {
      const r = el.getBoundingClientRect()
      if (r.width < 3 || r.height < 3) continue
      const cs = getComputedStyle(el)
      // a translucent surface is not a palette colour: it composites to something else
      if (!maskish(el) && alpha(cs.backgroundColor) > 0.01 && alpha(cs.backgroundColor) < 0.99) {
        const key = `TRANSLUCENT bg=${cs.backgroundColor} .${local(el).slice(0, 22)} "${(el.textContent || '').trim().slice(0, 14)}"`
        bad.set(key, (bad.get(key) ?? 0) + 1)
      }
      if (alpha(cs.color) > 0.01 && alpha(cs.color) < 0.99) {
        const key = `TRANSLUCENT ink=${cs.color} .${local(el).slice(0, 22)} "${(el.textContent || '').trim().slice(0, 14)}"`
        bad.set(key, (bad.get(key) ?? 0) + 1)
      }
      const grads = [...cs.backgroundImage.matchAll(/(rgba?\([^)]*\)|color\(srgb [^)]*\))/g)].map(m => m[1])
      const entries = [['bg', cs.backgroundColor], ['color', cs.color], ['border', cs.borderTopColor]]
      grads.forEach((g, i) => entries.push(['img' + i, g]))
      for (const [prop, value] of entries) {
        if (!value || value === 'rgba(0, 0, 0, 0)' || value === 'transparent') continue
        const rgb = parse(value)
        if (!rgb || !offender(rgb)) continue
        const key = `${prop}=${value} .${local(el).slice(0, 22)} "${(el.textContent || '').trim().slice(0, 14)}"`
        bad.set(key, (bad.get(key) ?? 0) + 1)
      }
    }
    return [...bad.entries()]
  })
  console.log(`--- ${label} (${out.length}) ---`)
  for (const [k, n] of out.slice(0, 10)) console.log(String(n).padStart(3), k)
}
await openSession()
await scan('session')
await scanTokens('session')
await page.getByText('Trajectory', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(1800)
await scan('trajectory')
await page.getByText('Chat', { exact: true }).first().click().catch(() => {})
await page.waitForTimeout(1200)
await page.getByText('Settings', { exact: true }).first().click(); await page.waitForTimeout(1600)
await scan('settings')
await page.keyboard.press('Escape'); await page.waitForTimeout(1000)
await page.getByText('Plugins', { exact: true }).first().click(); await page.waitForTimeout(1800)
await scan('plugins')
await browser.close()
