/**
 * Behavioural checks for the win2k plugin: the theme definition and cube row
 * the browser half registers, the chrome sheet it appends, the attribute that
 * scopes that sheet, the applier that keeps the choice across a reload, and the
 * host half's settings namespace.
 *
 * The bundle is evaluated the way the client module system loads it, against
 * the counting stub in `bench/harness.ts` — the same harness the perf gates
 * drive — so these tests exercise the shipped artifact, not a copy of it.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mount, readBundle, type Snapshot } from '../bench/harness.ts'
import { apply as applyHost, WIN2K_SETTINGS_NAMESPACE } from '../src/index.ts'

const BUNDLE = readBundle()

interface Element {
  type: unknown
  props: Record<string, unknown>
  children: unknown[]
}

/** Collect every element in a rendered tree. */
function walk(node: unknown, found: Element[] = []): Element[] {
  if (node === null || typeof node !== 'object') return found
  if (Array.isArray(node)) {
    for (const child of node) walk(child, found)
    return found
  }
  const element = node as Element
  if ('props' in element && 'type' in element) {
    found.push(element)
    for (const child of element.children) walk(child, found)
  }
  return found
}

const off: Snapshot = { status: 'ready', value: { selected: false }, writable: true }
const on: Snapshot = { status: 'ready', value: { selected: true }, writable: true }

test('the bundle stacks one token layer and its locale dictionary', () => {
  const harness = mount(BUNDLE, off)
  assert.equal(harness.layers.size, 0, 'off: no layer stacked')
  assert.deepEqual(harness.locales, ['win2k'])
  assert.deepEqual(harness.registration, { id: 'dsh-win2k', inject: ['slots', 'settingsScope', 'theme', 'locale'] })

  harness.publish(1, () => true)
  assert.equal(harness.layers.size, 1)
  const tokens = harness.layers.get('win2k')
  // One value per color scheme: the skin must not go illegible when the user's
  // underlying preference is dark.
  assert.deepEqual(tokens?.['--dsw-alias-bg-base'], { light: '#ffffff', dark: '#ffffff' })
  assert.deepEqual(tokens?.['--dsw-specific-sidebar-fill'], { light: '#d4d0c8', dark: '#d4d0c8' })
  assert.deepEqual(tokens?.['--dsw-alias-border-l4'], { light: '#404040', dark: '#404040' })
  assert.match(tokens?.['--dsw-font-family']?.light ?? '', /MS Sans Serif/)
})

test('the chrome sheet is appended once and stays scoped to the active theme', () => {
  const harness = mount(BUNDLE, off)

  assert.equal(harness.counters.headAppend, 1, 'one plugin-owned <style> tag')
  const sheet = harness.appended[0] ?? ''
  assert.match(sheet, /body\[data-dsw-win2k\]\{--dsw-corner-shape:square\}/)
  assert.match(sheet, /::-webkit-scrollbar-thumb/)
  // Every chrome rule is scoped: an unscoped one would repaint light and dark
  // too. The card classes are this package's own markup, so they are exempt.
  for (const rule of sheet.split('}').filter(part => part.trim().length > 0)) {
    const selector = rule.split('{')[0] ?? ''
    assert.ok(
      selector.includes('data-dsw-win2k') || selector.startsWith('@') || selector.startsWith('.dw-'),
      `unscoped rule: ${selector}`,
    )
  }
})

test('the scope attribute and the token layer follow the flag and retract on unload', () => {
  const harness = mount(BUNDLE, off)
  // Mounted with the skin off: no layer, so the chrome sheet is inert.
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)
  assert.equal(harness.layers.size, 0)

  harness.publish(1, () => true)
  assert.equal(harness.attributes.get('data-dsw-win2k'), true)
  assert.equal(harness.layers.size, 1)

  harness.publish(1, () => false)
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)
  assert.equal(harness.layers.size, 0, 'the layer is retracted, restoring the base theme')

  harness.publish(1, () => true)
  harness.dispose()
  assert.equal(harness.attributes.get('data-dsw-win2k'), undefined)
  assert.equal(harness.layers.size, 0, 'unload releases the layer')
})

test('a persisted selection re-stacks on startup', () => {
  const harness = mount(BUNDLE, on)
  assert.equal(harness.layers.size, 1)
  assert.equal(harness.attributes.get('data-dsw-win2k'), true)

  // Reload: the same persisted flag produces the layer again.
  const reloaded = mount(BUNDLE, on)
  assert.equal(reloaded.layers.size, 1)
})

test('the row is ordered under the Appearance row and its cube drives the flag', () => {
  const harness = mount(BUNDLE, off)
  const row = harness.rows[0]
  assert.ok(row, 'a component registered into settings.general.item')
  assert.equal(row.entry['name'], 'settings.general.item')
  assert.equal(row.entry['id'], 'win2k-theme')
  assert.equal(row.entry['order'], 11.5, 'between ui-theme Appearance 10 / Font size 11 and ui-chat Conversation display 12')

  const cube = walk(row.component()).filter((element) => element.type === 'button')[0]
  assert.ok(cube, 'the cube')
  assert.equal(cube.props['aria-pressed'], false)
  ;(cube.props['onClick'] as () => void)()

  assert.deepEqual(harness.writes, [['selected', true]])
  assert.equal(harness.layers.size, 0, 'the layer waits for the document to hold the choice')
})

test('a read-only deployment still applies the cube for the session', () => {
  const harness = mount(BUNDLE, { status: 'ready', value: { selected: false }, writable: false })
  const cube = walk(harness.rows[0]?.component()).filter((element) => element.type === 'button')[0]
  ;(cube?.props['onClick'] as () => void)()

  assert.deepEqual(harness.writes, [], 'nothing is written where the document cannot hold it')
  assert.equal(harness.layers.size, 1)
})

test('the host half registers the namespace with the row value and rejects a bad one', () => {
  const installed: { namespace: string; entry: unknown }[] = []
  const ctx = {
    inject: (_deps: readonly string[], callback: (scope: never) => void): void => {
      callback({
        settings: {
          installSection: (
            _owner: unknown,
            namespace: string,
            _schema: unknown,
            entry: unknown,
          ): void => { installed.push({ namespace, entry }) },
        },
      } as never)
    },
    settings: undefined as never,
  }

  applyHost(ctx as never, { selected: true })
  assert.deepEqual(installed, [{ namespace: WIN2K_SETTINGS_NAMESPACE, entry: { selected: true } }])

  applyHost(ctx as never)
  assert.deepEqual(installed[1], { namespace: WIN2K_SETTINGS_NAMESPACE, entry: { selected: false } })
})
