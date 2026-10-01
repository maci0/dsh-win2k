/** Native CSS regression checks; requires the running web profile. See README. */
import assert from 'node:assert/strict'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { page, browser, applyCandidate, openSession } from './_page.mjs'

const output = process.env.DSH_VISUAL_OUTPUT ?? '.scratch/visual'
await mkdir(output, { recursive: true })
const report = { checks: [], errors: [] }
page.on('pageerror', error => report.errors.push(error.message))
const shot = path => process.env.DSH_VISUAL_SCREENSHOTS === '0' ? Promise.resolve() : page.screenshot({ path })
const check = (name, actual, expected) => {
  report.checks.push({ name, actual, expected })
}
try {
  if (!process.env.DSH_WIN2K_BUNDLE) await applyCandidate(new URL('../lib/client.js', import.meta.url))
  const palette = await page.evaluate(() => {
    const s = getComputedStyle(document.body)
    return ['--dsw-alias-file-diff-added-bg', '--dsw-alias-file-diff-deleted-bg', '--dsw-alias-file-diff-added-marker', '--dsw-alias-file-diff-deleted-marker', '--dsw-alias-label-shimmer'].map(name => s.getPropertyValue(name).trim())
  })
  check('opaque diff and busy palette', palette, ['#ffffff', '#ffffe1', '#008000', '#800000', '#404040'])
  await openSession()
  const caption = page.locator('header:has([data-conversation-header-leading]) [class*="titleRow"]')
  if (await caption.locator('nav').count()) {
    const metrics = await caption.evaluate(e => ({
      gradient: getComputedStyle(e).backgroundImage.startsWith('linear-gradient'),
      height: e.getBoundingClientRect().height,
      titleInk: getComputedStyle(e.querySelector('nav span')).color,
      controlHeight: e.querySelector('button').getBoundingClientRect().height,
    }))
    check('resident caption gradient', metrics.gradient, true)
    check('resident caption height', metrics.height, 20)
    check('resident caption title ink', metrics.titleInk, 'rgb(255, 255, 255)')
    check('resident caption control height', metrics.controlHeight, 16)
  }
  for (const width of [2000, 390]) {
    await page.setViewportSize({ width, height: 1100 })
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
    await shot(`${output}/main-${width}.png`)
    const fixture = await page.evaluate(() => {
      const root = document.createElement('div')
      root.id = 'win2k-visual-fixture'
      root.style.cssText = 'position:fixed;inset:100px 20px auto;z-index:2000;background:white;padding:8px'
      root.innerHTML = '<div class="_fixture_dock" data-goal-bar style="width:100%"><div class="_fixture_bar" style="max-width:896px;margin:auto;background:var(--dsw-specific-menu);padding:8px">Ongoing Goal: visual check</div></div><div class="_fixture_dock" id="visual-status">Status</div><a href="#visual-link">Link</a>'
      document.body.append(root)
      return {
        background: getComputedStyle(root.querySelector('[data-goal-bar]')).backgroundColor,
        shadow: getComputedStyle(root.querySelector('[data-goal-bar]')).boxShadow,
        status: getComputedStyle(root.querySelector('#visual-status')).backgroundColor,
        link: getComputedStyle(root.querySelector('a')).cursor,
      }
    })
    check(`goal wrapper ${width}`, fixture.background, 'rgba(0, 0, 0, 0)')
    check(`goal groove ${width}`, fixture.shadow, 'none')
    check(`status face ${width}`, fixture.status, 'rgb(212, 208, 200)')
    const hand = (await readFile(new URL('./reference/link-hand.png', import.meta.url))).toString('base64')
    check(`original link hand ${width}`, fixture.link.includes(hand) && fixture.link.includes('6 2'), true)
    await shot(`${output}/goal-${width}.png`)
    await page.evaluate(() => document.querySelector('#win2k-visual-fixture').remove())

    const menuTrigger = page.getByRole('button', { name: 'View options', exact: true })
    if (width >= 600 && await menuTrigger.isVisible()) {
      await menuTrigger.click()
      const item = page.locator('[role="menuitemradio"],[role="menuitem"]').first()
      await item.hover()
      check(`menu shell arrow ${width}`, await item.evaluate(e => getComputedStyle(e).cursor.includes('2 4')), true)
      await page.keyboard.press('ArrowDown')
      await shot(`${output}/menu-${width}.png`)
      await page.keyboard.press('Escape')
    }
    const tree = page.locator('[role="treeitem"][aria-expanded] span > svg[width="14"]').first()
    if (width >= 600 && await tree.isVisible()) {
      const expanded = await tree.evaluate(e => e.closest('[role="treeitem"]').getAttribute('aria-expanded') === 'true')
      const closed = (await readFile(new URL(`./reference/tree-${expanded ? 'minus' : 'plus'}.png`, import.meta.url))).toString('base64')
      const treeStyle = await tree.evaluate((e, png) => ({ imageMatches: getComputedStyle(e).backgroundImage.includes(png), size: getComputedStyle(e).backgroundSize, expanded: e.closest('[role="treeitem"]').getAttribute('aria-expanded') }), closed)
      report.treeStyle = treeStyle
      check(`original tree box ${width}`, treeStyle.imageMatches && treeStyle.size === '9px 9px', true)
    }

    await page.getByRole('button', { name: 'Settings', exact: true }).click()
    const dialog = page.locator('[data-shortcut-modal="settings"]')
    await dialog.waitFor()
    const metrics = await dialog.evaluate(e => {
      const title = e.querySelector('[class*="navTitle"]')
      const label = e.querySelector('[class*="navLabel"]')
      const options = e.querySelector('[class*="options"]')
      const toggle = e.querySelector('[role="switch"]')
      return {
        caption: getComputedStyle(title).backgroundImage.startsWith('linear-gradient'),
        captionFont: getComputedStyle(title).fontSize,
        captionInk: getComputedStyle(title).color,
        captionChildrenWhite: Array.from(title.querySelectorAll('*')).every(child => getComputedStyle(child).color === 'rgb(255, 255, 255)'),
        labelPadding: getComputedStyle(label).paddingTop,
        optionsOverflow: options.scrollWidth - options.clientWidth,
        toggleWidth: toggle?.getBoundingClientRect().width,
        closeHeight: e.querySelector('[class*="close"]').getBoundingClientRect().height,
      }
    })
    check(`caption ${width}`, metrics.caption, true)
    check(`caption font ${width}`, metrics.captionFont, '12px')
    check(`caption ink ${width}`, metrics.captionInk, 'rgb(255, 255, 255)')
    check(`caption child ink ${width}`, metrics.captionChildrenWhite, true)
    check(`nav label padding ${width}`, metrics.labelPadding, '0px')
    check(`options fit ${width}`, metrics.optionsOverflow <= 2, true)
    check(`checkbox width ${width}`, metrics.toggleWidth, 13)
    check(`caption close ${width}`, metrics.closeHeight, 16)
    check(`undimmed modal ${width}`, await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--dsw-alias-bg-mask-1').trim()), 'transparent')
    const disabled = page.locator('button:disabled').first()
    if (await disabled.count()) check(`disabled shell arrow ${width}`, await disabled.evaluate(e => getComputedStyle(e).cursor.includes('2 4')), true)
    await shot(`${output}/settings-${width}.png`)
    await dialog.getByRole('button', { name: 'Models', exact: true }).click()
    await shot(`${output}/models-${width}.png`)
    await dialog.getByRole('button', { name: 'Agent presets', exact: true }).click()
    const preset = await dialog.locator('[class*="cardName"]').first().evaluate(e => ({
      wraps: getComputedStyle(e).whiteSpace,
      overflow: getComputedStyle(e).overflow,
      plate: getComputedStyle(e.closest('button')).boxShadow,
    }))
    check(`preset name remains readable ${width}`, preset, { wraps: 'normal', overflow: 'visible', plate: 'none' })
    await shot(`${output}/presets-${width}.png`)
    await dialog.locator('button').filter({ hasText: 'Mode details' }).first().click()
    const guide = page.getByRole('dialog').last()
    const guideMetrics = await guide.evaluate(e => {
      const title = e.querySelector('h2'), band = title.parentElement
      return { height: band.getBoundingClientRect().height, ink: getComputedStyle(title).color,
        font: getComputedStyle(title).fontSize, close: band.querySelector('button').getBoundingClientRect().height,
        gradient: getComputedStyle(band).backgroundImage.startsWith('linear-gradient') }
    })
    check(`help caption ${width}`, guideMetrics, { height: 20, ink: 'rgb(255, 255, 255)', font: '12px', close: 16, gradient: true })
    await shot(`${output}/help-${width}.png`)
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: 'Plugins', exact: true }).first().click()
    await shot(`${output}/plugins-${width}.png`)
    await page.getByRole('button', { name: 'New session', exact: true }).first().click()
  }
  assert.deepEqual(report.errors, [])
  for (const { name, actual, expected } of report.checks) assert.deepEqual(actual, expected, name)
  console.log(`${report.checks.length} native visual checks passed at desktop and mobile sizes.`)
} finally {
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2))
  await browser.close()
}
