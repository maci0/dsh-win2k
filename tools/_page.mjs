/**
 * The page every audit check drives.
 *
 * One headless Chromium against a live `dsh web` at http://127.0.0.1:3080, one
 * auth cookie from DSH_COOKIE (default .scratch/cookie.json in this checkout,
 * gitignored, shaped { name, value }), and the win2k cube toggled on if it is not already. A check
 * imports `page` for its own evaluate calls, calls `openSession()` when it needs
 * a transcript on screen, and closes `browser` when it is done. Playwright comes
 * from DSH_PLAYWRIGHT when that names an installed copy. See tools/README.md.
 */
const { chromium } = await import(process.env.DSH_PLAYWRIGHT ?? 'playwright')
import { readFileSync } from 'node:fs'
import { readFile } from 'node:fs/promises'

const cookie = JSON.parse(readFileSync(process.env.DSH_COOKIE ?? new URL('../.scratch/cookie.json', import.meta.url), 'utf8'))
const browser = await chromium.launch(process.env.DSH_CHROMIUM ? { executablePath: process.env.DSH_CHROMIUM } : {})
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

// The class-name reader every page-side scan uses: one class per part, the
// CSS-module hash stripped. Installed on the page because an `evaluate`
// callback is serialized without its module scope, so it cannot close over this
// file's own `local`.
await page.evaluate(() => {
  window.local = (el) => (el && typeof el.className === 'string'
    ? String(el.className).split(/\s+/).map((c) => c.replace(/^[A-Za-z0-9]+[_-]/, '')).join('.')
    : '')
})

/** Open the first session the sidebar offers and wait for its transcript. */
export async function openSession() {
  const sessions = page.locator('[data-row-key^="session:"]').filter({ hasNotText: /^New Session$/ })
  for (let i = 0; i < 45 && !(await sessions.count()); i++) {
    const folders = page.locator('[role="treeitem"][aria-expanded="false"]')
    if (!(await folders.count())) return
    await folders.first().click()
    await page.waitForTimeout(100)
  }
  if (!(await sessions.count())) return
  await sessions.first().click()
  await page.locator('[data-variant]').first().waitFor({ timeout: 15000 }).catch(() => {})
}

export { page, browser }

/** Preview a candidate without writing profile settings. */
export async function applyCandidate(path) {
  // Load the candidate through its actual factory, without a real settings write.
  await page.evaluate(() => {
    for (const style of document.querySelectorAll('style')) {
      if (style.textContent.includes('@font-face{font-family:"Win2k UI"')) style.remove()
    }
    window.win2kVisualCapture = definition => { window.win2kVisualDefinition = definition }
  })
  const bundle = await readFile(path, 'utf8')
  await page.addScriptTag({ content: bundle.replace('window.__ModuleLoader__.load', 'window.win2kVisualCapture') })
  await page.evaluate(() => {
    const scope = { getSnapshot: () => ({ status: 'ready', value: { selected: true }, writable: false }), subscribe: () => () => {} }
    window.win2kVisualDefinition.factory(() => ({})).apply({
      theme: { overrideTokens: (_id, tokens) => {
        for (const [name, value] of Object.entries(tokens)) document.body.style.setProperty(name, value.light)
        return () => {}
      } },
      configForms: { get: () => scope },
      locale: { register: () => () => {}, bind: () => key => key },
      effect: callback => callback(),
      slots: { inject: (_name, callback) => callback(), register: () => () => {} },
    })
  })
}

if (process.env.DSH_WIN2K_BUNDLE) await applyCandidate(process.env.DSH_WIN2K_BUNDLE)
