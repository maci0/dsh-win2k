/**
 * Behavioural checks for the win2k plugin: the client bundle's theme applier,
 * the card it registers, and the host half's settings namespace.
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

/** Minimal React stub with stateful hooks, so a click can be re-rendered. */
function createReactStub() {
  const hooks: unknown[] = []
  let cursor = 0
  return {
    reset: (): void => { cursor = 0 },
    createElement: (type: unknown, props: Record<string, unknown> | null, ...children: unknown[]): Element => ({
      type,
      props: props ?? {},
      children: children.flat(),
    }),
    useSyncExternalStore: (_subscribe: (listener: () => void) => () => void, getSnapshot: () => unknown): unknown =>
      getSnapshot(),
    useState: (initial: unknown): [unknown, (next: unknown) => void] => {
      const slot = cursor
      cursor += 1
      if (hooks.length <= slot) hooks[slot] = initial
      return [hooks[slot], (next: unknown) => {
        hooks[slot] = typeof next === 'function' ? (next as (prev: unknown) => unknown)(hooks[slot]) : next
      }]
    },
  }
}

type ReactStub = ReturnType<typeof createReactStub>

interface Snapshot {
  status: string
  value: unknown
  writable: boolean
}

interface Harness {
  theme: {
    registered: { id: string; colorScheme: string; tokens: Record<string, string> }[]
    preference: string
  }
  calls: unknown[][]
  setSnapshot: (next: Snapshot) => void
  fireSettings: () => void
  cards: { entry: Record<string, unknown>; component: () => Element | null }[]
  react: ReactStub
  appended: { textContent: string }[]
}

/** Load the bundle the way the client module system does and apply it. */
function mount(snapshot: Snapshot): Harness {
  const react = createReactStub()
  const calls: unknown[][] = []
  let current = snapshot
  const listeners = new Set<() => void>()
  const scope = {
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => { listeners.delete(listener) }
    },
    getSnapshot: (): Snapshot => current,
    set: async (field: string, value: unknown): Promise<void> => { calls.push([field, value]) },
  }

  const registered: { id: string; colorScheme: string; tokens: Record<string, string> }[] = []
  const themeState = { preference: 'system' }
  const theme = {
    register: (definition: { id: string; colorScheme: string; tokens: Record<string, string> }): (() => void) => {
      registered.push(definition)
      return () => {}
    },
    getTheme: () => ({
      preference: themeState.preference,
      active: { id: themeState.preference === 'system' ? 'light' : themeState.preference },
    }),
    setTheme: (id: string): void => { themeState.preference = id },
  }

  const cards: Harness['cards'] = []
  const ctx = {
    theme,
    settingsScope: { bind: () => scope },
    effect: (callback: () => unknown): void => { callback() },
    on: (_event: string, _listener: () => void): (() => void) => () => {},
    slots: {
      inject: (_name: string, callback: () => unknown): void => { callback() },
      register: (entry: Record<string, unknown>, component: () => Element | null) => {
        cards.push({ entry, component })
        return () => {}
      },
    },
  }

  const appended: { textContent: string }[] = []
  const documentStub = {
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
  assert.deepEqual(exported['inject'], ['slots', 'settingsScope', 'theme'])
  ;(exported['apply'] as (ctx: unknown) => void)(ctx)

  return {
    theme: {
      registered,
      /** Live read: the applier keeps moving the preference after the mount. */
      get preference(): string { return themeState.preference },
    },
    calls,
    setSnapshot: (next: Snapshot): void => {
      current = next
      for (const listener of listeners) listener()
    },
    fireSettings: () => { for (const listener of listeners) listener() },
    cards,
    react,
    appended,
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

function pills(tree: Element[]): Element[] {
  return tree.filter((element) => element.props['role'] === 'radio')
}

const ready = (enabled: unknown): Snapshot => ({
  status: 'ready',
  value: enabled === undefined ? {} : { enabled },
  writable: true,
})

test('the bundle appends its chrome sheet and registers the win2k theme', () => {
  const harness = mount(ready(true))

  assert.equal(harness.appended.length, 1, 'one plugin-owned <style> tag')
  const sheet = harness.appended[0]?.textContent ?? ''
  assert.match(sheet, /--dsw-corner-shape:square/)
  assert.match(sheet, /::-webkit-scrollbar-thumb/)

  assert.equal(harness.theme.registered.length, 1)
  const definition = harness.theme.registered[0]
  assert.equal(definition?.id, 'win2k')
  assert.equal(definition?.colorScheme, 'light')
  assert.equal(definition?.tokens['--dsw-alias-bg-base'], '#ffffff')
  assert.equal(definition?.tokens['--dsw-specific-sidebar-fill'], '#d4d0c8')
  assert.match(definition?.tokens['--dsw-font-family'] ?? '', /MS Sans Serif/)
})

test('enabled forces win2k, and switching it off restores the prior preference', () => {
  const harness = mount(ready(true))
  assert.equal(harness.theme.preference, 'win2k')

  harness.setSnapshot(ready(false))
  assert.equal(harness.theme.preference, 'system', 'the preference captured before forcing comes back')

  harness.setSnapshot(ready(true))
  assert.equal(harness.theme.preference, 'win2k')
})

test('a deployment that serves no namespace still gets the theme', () => {
  // status !== 'ready' means the namespace is unavailable, not "off": the
  // row config default is on, and the browser half alone should still theme.
  const harness = mount({ status: 'loading', value: null, writable: false })
  assert.equal(harness.theme.preference, 'win2k')
})

test('the card is keyed on the namespace and its Off pill writes enabled=false', () => {
  const harness = mount(ready(true))
  const card = harness.cards[0]
  assert.ok(card, 'a card registered into settings.plugin.item')
  assert.equal(card?.entry['name'], 'settings.plugin.item')
  assert.equal(card?.entry['key'], WIN2K_SETTINGS_NAMESPACE)

  // Expand, then read the pills back off the re-rendered tree.
  harness.react.reset()
  const collapsed = walk(card?.component())
  const header = collapsed.filter((element) => element.type === 'button')[0]
  assert.ok(header)
  ;(header?.props['onClick'] as () => void)()

  harness.react.reset()
  const tree = walk(card?.component())
  const off = pills(tree).filter((element) => element.children[0] === 'Off')[0]
  assert.ok(off, 'an Off pill')
  ;(off?.props['onClick'] as () => void)()
  assert.deepEqual(harness.calls, [['enabled', false]])
})

test('the host half registers the namespace with the row value', () => {
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

  applyHost(ctx as never, { enabled: false })
  assert.deepEqual(installed, [{ namespace: WIN2K_SETTINGS_NAMESPACE, entry: { enabled: false } }])

  assert.throws(
    () => { applyHost(ctx as never, { enabled: 'yes' as unknown as boolean }) },
    /enabled must be a boolean/,
  )
})
