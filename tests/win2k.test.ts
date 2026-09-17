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

type ReactStub = ReturnType<typeof createReactStub>

interface Snapshot {
  status: string
  value: unknown
  writable: boolean
}

interface Harness {
  registered: { id: string; label?: string; colorScheme: string; tokens: Record<string, string> }[]
  rows: { entry: Record<string, unknown>; component: () => Element | null }[]
  appended: { textContent: string }[]
  attributes: Map<string, boolean>
  writes: unknown[][]
  locales: string[]
  theme: { registered: unknown[]; get preference(): string }
  react: ReactStub
  /** Drive one settings snapshot through the plugin's scope subscription. */
  publish: (next: Snapshot) => void
  /** Drive one theme snapshot through the plugin's `theme/change` listener. */
  publishTheme: (activeId: string) => void
  /** Drop the plugin the way an unload does. */
  dispose: () => void
}

/** Load the bundle the way the client module system does and apply it. */
function mount(snapshot: Snapshot): Harness {
  const react = createReactStub()
  const registered: Harness['registered'] = []
  const rows: Harness['rows'] = []
  const appended: { textContent: string }[] = []
  const attributes = new Map<string, boolean>()
  const writes: unknown[][] = []
  const locales: string[] = []
  const themeListeners: ((activeId: string) => void)[] = []
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

  const themeState = { preference: 'system', active: 'light' }
  const theme = {
    register: (definition: Harness['registered'][number]): (() => void) => {
      registered.push(definition)
      return () => {}
    },
    getTheme: () => ({ preference: themeState.preference, active: { id: themeState.active }, themes: [] }),
    setTheme: (id: string): void => {
      themeState.preference = id
      themeState.active = id === 'system' ? 'light' : id
      for (const listener of themeListeners) listener(themeState.active)
    },
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
    on: (_event: string, listener: (activeId: string) => void): (() => void) => {
      themeListeners.push(listener)
      return () => {}
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
    registered,
    rows,
    appended,
    attributes,
    writes,
    locales,
    react,
    theme: {
      registered,
      /** Live read: the applier keeps moving the preference after the mount. */
      get preference(): string { return themeState.preference },
    },
    publish: (next: Snapshot): void => {
      current = next
      for (const listener of settingsListeners) listener(next)
    },
    publishTheme: (activeId: string): void => {
      themeState.preference = activeId
      themeState.active = activeId === 'system' ? 'light' : activeId
      for (const listener of themeListeners) listener(themeState.active)
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

test('the bundle registers one light theme and its locale dictionary', () => {
  const harness = mount(off)

  assert.equal(harness.registered.length, 1)
  const definition = harness.registered[0]
  assert.equal(definition?.id, 'win2k')
  assert.equal(definition?.colorScheme, 'light')
  assert.equal(definition?.tokens['--dsw-alias-bg-base'], '#ffffff')
  assert.equal(definition?.tokens['--dsw-specific-sidebar-fill'], '#d4d0c8')
  assert.equal(definition?.tokens['--dsw-alias-border-l4'], '#404040')
  assert.match(definition?.tokens['--dsw-font-family'] ?? '', /MS Sans Serif/)
  assert.deepEqual(harness.locales, ['win2k'])
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

test('the scope attribute follows the active theme and is retracted on unload', () => {
  const harness = mount(off)
  // Mounted under the default light palette: the attribute is off, so the
  // chrome sheet is inert until the theme is selected.
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)

  harness.publish(on)
  assert.equal(harness.theme.preference, 'win2k')
  assert.equal(harness.attributes.get('data-dsw-win2k'), true)

  harness.publish(off)
  assert.equal(harness.theme.preference, 'system')
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)

  harness.dispose()
  assert.equal(harness.attributes.get('data-dsw-win2k'), undefined)
})

test('a persisted selection survives startup and a built-in click bounces back', () => {
  // The durable preference is a built-in: the flag is what re-applies win2k.
  const harness = mount(on)
  assert.equal(harness.theme.preference, 'win2k')

  harness.publishTheme('dark')
  assert.equal(harness.theme.preference, 'win2k', 'the flag outranks a built-in click')

  harness.publish(off)
  assert.equal(harness.theme.preference, 'system', 'the preference captured before forcing comes back')
})

test('the row is ordered under the Appearance row and its cube drives the flag', () => {
  const harness = mount(off)
  const row = harness.rows[0]
  assert.ok(row, 'a component registered into settings.general.item')
  assert.equal(row?.entry['name'], 'settings.general.item')
  assert.equal(row?.entry['id'], 'win2k-theme')
  assert.equal(row?.entry['order'], 12, 'ui-theme registers the Appearance row at order 10')

  const tree = walk(row?.component())
  const cube = tree.filter((element) => element.type === 'button')[0]
  assert.ok(cube, 'the cube')
  assert.equal(cube?.props['aria-pressed'], false)
  ;(cube?.props['onClick'] as () => void)()

  assert.deepEqual(harness.writes, [['selected', true]])
  assert.equal(harness.theme.preference, 'system', 'the theme waits for the document to hold the choice')
})

test('a read-only deployment still applies the cube for the session', () => {
  const harness = mount({ status: 'ready', value: { selected: false }, writable: false })
  const cube = walk(harness.rows[0]?.component()).filter((element) => element.type === 'button')[0]
  ;(cube?.props['onClick'] as () => void)()

  assert.deepEqual(harness.writes, [], 'nothing is written where the document cannot hold it')
  assert.equal(harness.theme.preference, 'win2k')
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
