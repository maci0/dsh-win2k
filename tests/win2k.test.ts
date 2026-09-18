/**
 * Behavioural checks for the win2k plugin: the theme definition and cube row
 * the browser half registers, the chrome sheet it appends, the attribute that
 * scopes that sheet, the applier that keeps the choice across a reload, and the
 * host half's settings namespace.
 *
 * The bundle is evaluated the way the client module system loads it (a
 * lazy-CJS factory on `window.__ModuleLoader__`), so these tests exercise the
 * shipped artifact, not a copy of it.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply as applyHost, WIN2K_SETTINGS_NAMESPACE } from '../src/index.ts'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundlePath = join(packageRoot, 'lib', 'client.js')

interface Element {
  type: unknown
  props: Record<string, unknown>
  children: unknown[]
}

/** Minimal React stub: the row reads its snapshot through useSyncExternalStore only. */
function createReactStub() {
  return {
    createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Element => ({
      type,
      props: props ?? {},
      children: children.flat(),
    }),
    useSyncExternalStore: (_subscribe: (listener: () => void) => () => void, getSnapshot: () => unknown): unknown =>
      getSnapshot(),
  }
}

interface Snapshot {
  status: string
  value: unknown
  writable: boolean
}

interface Harness {
  layers: { source: string; tokens: Record<string, { light: string; dark: string }> }[]
  rows: { entry: Record<string, unknown>; component: () => Element | null }[]
  appended: { textContent: string }[]
  attributes: Map<string, boolean>
  writes: unknown[][]
  locales: string[]
  theme: { layers: Harness['layers']; get preference(): string }
  /** Drive one settings snapshot through the plugin's scope subscription. */
  publish: (next: Snapshot) => void
  /** Drive one theme preference change, the way a built-in cube click does. */
  publishTheme: (preference: string) => void
  /** Drop the plugin the way an unload does. */
  dispose: () => void
}

/** Load the bundle the way the client module system does and apply it. */
function mount(snapshot: Snapshot): Harness {
  const react = createReactStub()
  const layers: Harness['layers'] = []
  const rows: Harness['rows'] = []
  const appended: { textContent: string }[] = []
  const attributes = new Map<string, boolean>()
  const writes: unknown[][] = []
  const locales: string[] = []
  const settingsListeners: ((snapshot: Snapshot) => void)[] = []
  const disposers: (() => void)[] = []

  let current = snapshot
  const scope = {
    subscribe: (listener: (snapshot: Snapshot) => void): (() => void) => {
      settingsListeners.push(listener)
      return () => {}
    },
    getSnapshot: (): Snapshot => current,
    set: async (field: string, value: unknown): Promise<void> => { writes.push([field, value]) },
  }

  // The durable preference is a built-in and stays one: win2k stacks a token
  // layer above it instead of registering a third-party preference id.
  const themeState = { preference: 'system' }
  const theme = {
    overrideTokens: (
      source: string,
      tokens: Record<string, { light: string; dark: string }>,
    ): (() => void) => {
      layers.push({ source, tokens })
      return () => {
        const index = layers.findIndex(entry => entry.source === source)
        if (index >= 0) layers.splice(index, 1)
      }
    },
    register: (): void => { throw new Error('win2k must not register a theme id') },
    setTheme: (): void => { throw new Error('win2k must not move the durable preference') },
  }

  const ctx = {
    theme,
    locale: {
      register: (namespace: string): (() => void) => {
        locales.push(namespace)
        return () => {}
      },
      bind: () => (key: string) => key,
    },
    settingsScope: { bind: () => scope },
    // The fake runs the callback immediately, the way Cordis does, and keeps
    // the disposer it returns so the test can observe an unload.
    effect: (callback: () => unknown): unknown => {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer as () => void)
      return disposer
    },
    slots: {
      inject: (_name: string, callback: () => unknown): void => { callback() },
      register: (entry: Record<string, unknown>, component: () => Element | null) => {
        rows.push({ entry, component })
        return () => {}
      },
    },
  }

  const body = {
    toggleAttribute: (name: string, on: boolean): void => { attributes.set(name, on) },
    removeAttribute: (name: string): void => { attributes.delete(name) },
  }
  const documentStub = {
    body,
    createElement: (): { textContent: string } => ({ textContent: '' }),
    head: { append: (element: { textContent: string }): void => { appended.push(element) } },
  }

  let loaded: { id: string; factory: (require: (id: string) => unknown) => Record<string, unknown> } | undefined
  const windowStub = { __ModuleLoader__: { load: (registration: typeof loaded): void => { loaded = registration } } }
  const requireFn = (id: string): unknown => {
    assert.equal(id, 'react', `the bundle may only require react, got ${id}`)
    return react
  }

  new Function('window', 'require', 'document', readFileSync(bundlePath, 'utf8'))(
    windowStub,
    requireFn,
    documentStub,
  )
  assert.ok(loaded, 'the bundle registered itself on window.__ModuleLoader__')
  assert.equal(loaded.id, 'dsh-win2k')

  const exported = loaded.factory(requireFn)
  assert.deepEqual(exported['inject'], ['slots', 'settingsScope', 'theme', 'locale'])
  ;(exported['apply'] as (ctx: unknown) => void)(ctx)

  return {
    layers,
    rows,
    appended,
    attributes,
    writes,
    locales,
    theme: {
      layers,
      /** Live read: the durable preference stays a built-in. */
      get preference(): string { return themeState.preference },
    },
    publish: (next: Snapshot): void => {
      current = next
      for (const listener of settingsListeners) listener(next)
    },
    publishTheme: (preference: string): void => {
      themeState.preference = preference
    },
    dispose: (): void => {
      for (const disposer of disposers.reverse()) disposer()
    },
  }
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
  const harness = mount(off)
  assert.equal(harness.layers.length, 0, 'off: no layer stacked')
  assert.deepEqual(harness.locales, ['win2k'])

  harness.publish(on)
  assert.equal(harness.layers.length, 1)
  const layer = harness.layers[0]
  assert.equal(layer?.source, 'win2k')
  // One value per color scheme: the skin must not go illegible when the user's
  // underlying preference is dark.
  assert.deepEqual(layer?.tokens['--dsw-alias-bg-base'], { light: '#ffffff', dark: '#ffffff' })
  assert.deepEqual(layer?.tokens['--dsw-specific-sidebar-fill'], { light: '#d4d0c8', dark: '#d4d0c8' })
  assert.deepEqual(layer?.tokens['--dsw-alias-border-l4'], { light: '#404040', dark: '#404040' })
  assert.match(layer?.tokens['--dsw-font-family']?.light ?? '', /MS Sans Serif/)
})

test('the chrome sheet is appended once and stays scoped to the active theme', () => {
  const harness = mount(off)

  assert.equal(harness.appended.length, 1, 'one plugin-owned <style> tag')
  const sheet = harness.appended[0]?.textContent ?? ''
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
  const harness = mount(off)
  // Mounted with the skin off: no layer, so the chrome sheet is inert.
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)
  assert.equal(harness.layers.length, 0)

  harness.publish(on)
  assert.equal(harness.attributes.get('data-dsw-win2k'), true)
  assert.equal(harness.layers.length, 1)
  assert.equal(harness.theme.preference, 'system', 'the durable preference is never moved')

  harness.publish(off)
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)
  assert.equal(harness.layers.length, 0, 'the layer is retracted, restoring the base theme')

  harness.publish(on)
  harness.dispose()
  assert.equal(harness.attributes.get('data-dsw-win2k'), undefined)
  assert.equal(harness.layers.length, 0, 'unload releases the layer')
})

test('a persisted selection re-stacks on startup and outlives a built-in click', () => {
  // The durable preference is a built-in; the flag is what keeps the skin on.
  const harness = mount(on)
  assert.equal(harness.theme.preference, 'system', 'win2k never takes the preference')
  assert.equal(harness.layers.length, 1)

  // A click on Light/Dark writes the durable preference. The skin stays on top.
  harness.publishTheme('dark')
  assert.equal(harness.theme.preference, 'dark')
  assert.equal(harness.layers.length, 1, 'a built-in click cannot drop the skin')

  // Reload: the same durable preference and the same flag produce the layer.
  const reloaded = mount(on)
  assert.equal(reloaded.theme.preference, 'system')
  assert.equal(reloaded.layers.length, 1)
})

test('the row is ordered under the Appearance row and its cube drives the flag', () => {
  const harness = mount(off)
  const row = harness.rows[0]
  assert.ok(row, 'a component registered into settings.general.item')
  assert.equal(row?.entry['name'], 'settings.general.item')
  assert.equal(row?.entry['id'], 'win2k-theme')
  assert.equal(row?.entry['order'], 11.5, 'between ui-theme Appearance 10 / Font size 11 and ui-chat Conversation display 12')

  const tree = walk(row?.component())
  const cube = tree.filter((element) => element.type === 'button')[0]
  assert.ok(cube, 'the cube')
  assert.equal(cube?.props['aria-pressed'], false)
  ;(cube?.props['onClick'] as () => void)()

  assert.deepEqual(harness.writes, [['selected', true]])
  assert.equal(harness.layers.length, 0, 'the layer waits for the document to hold the choice')
})

test('a read-only deployment still applies the cube for the session', () => {
  const harness = mount({ status: 'ready', value: { selected: false }, writable: false })
  const cube = walk(harness.rows[0]?.component()).filter((element) => element.type === 'button')[0]
  ;(cube?.props['onClick'] as () => void)()

  assert.deepEqual(harness.writes, [], 'nothing is written where the document cannot hold it')
  assert.equal(harness.layers.length, 1)
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

  assert.throws(
    () => { applyHost(ctx as never, { selected: 'yes' as unknown as boolean }) },
    /selected must be a boolean/,
  )
})
