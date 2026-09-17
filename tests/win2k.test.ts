/**
 * Behavioural checks for the win2k plugin: the theme definition the browser
 * half registers, the chrome sheet it appends, and the attribute that scopes
 * that sheet to the active theme.
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
import { apply as applyHost } from '../src/index.ts'

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const bundlePath = join(packageRoot, 'lib', 'client.js')

interface ThemeDefinition {
  id: string
  label?: string
  colorScheme: string
  tokens: Record<string, string>
}

interface Harness {
  registered: ThemeDefinition[]
  cards: unknown[]
  appended: { textContent: string }[]
  attributes: Map<string, boolean>
  /** Drive one theme snapshot through the plugin's `theme/change` listener. */
  publish: (activeId: string) => void
  /** Drop the plugin the way an unload does. */
  dispose: () => void
}

/** Load the bundle the way the client module system does and apply it. */
function mount(): Harness {
  const registered: ThemeDefinition[] = []
  const listeners: ((snapshot: { active: { id: string } }) => void)[] = []
  const attributes = new Map<string, boolean>()
  const cards: unknown[] = []

  const theme = {
    register: (definition: ThemeDefinition): (() => void) => {
      registered.push(definition)
      return () => {}
    },
    getTheme: () => ({ preference: 'system', active: { id: 'light' }, themes: [] }),
  }

  const disposers: (() => void)[] = []
  const ctx = {
    theme,
    on: (_event: string, listener: (snapshot: { active: { id: string } }) => void): (() => void) => {
      listeners.push(listener)
      return () => {}
    },
    // The fake runs the callback immediately, the way Cordis does, and keeps
    // the disposer it returns so the test can observe an unload.
    effect: (callback: () => unknown): unknown => {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer as () => void)
      return disposer
    },
    slots: {
      inject: (_name: string, callback: () => unknown): void => { callback() },
      register: (entry: Record<string, unknown>): (() => void) => {
        cards.push(entry)
        return () => {}
      },
    },
  }

  const appended: { textContent: string }[] = []
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
    throw new Error(`the bundle required "${id}", which is not part of this plugin`)
  }

  new Function('window', 'require', 'document', readFileSync(bundlePath, 'utf8'))(
    windowStub,
    requireFn,
    documentStub,
  )
  assert.ok(loaded, 'the bundle registered itself on window.__ModuleLoader__')
  assert.equal(loaded.id, 'dsh-win2k')

  const exported = loaded.factory(requireFn)
  assert.deepEqual(exported['inject'], ['theme'])
  ;(exported['apply'] as (ctx: unknown) => void)(ctx)

  return {
    registered,
    cards,
    appended,
    attributes,
    publish: (activeId: string): void => {
      for (const listener of listeners) listener({ active: { id: activeId } })
    },
    dispose: (): void => {
      for (const disposer of disposers.reverse()) disposer()
    },
  }
}

test('the bundle registers one light theme labelled for the Appearance row', () => {
  const harness = mount()

  assert.equal(harness.registered.length, 1)
  const definition = harness.registered[0]
  assert.equal(definition?.id, 'win2k')
  assert.equal(definition?.label, 'Windows 2000')
  assert.equal(definition?.colorScheme, 'light')
  assert.equal(definition?.tokens['--dsw-alias-bg-base'], '#ffffff')
  assert.equal(definition?.tokens['--dsw-specific-sidebar-fill'], '#d4d0c8')
  assert.equal(definition?.tokens['--dsw-alias-border-l4'], '#404040')
  assert.match(definition?.tokens['--dsw-font-family'] ?? '', /MS Sans Serif/)
})

test('the chrome sheet is appended once and stays scoped to the active theme', () => {
  const harness = mount()

  assert.equal(harness.appended.length, 1, 'one plugin-owned <style> tag')
  const sheet = harness.appended[0]?.textContent ?? ''
  assert.match(sheet, /body\[data-dsw-win2k\]\{--dsw-corner-shape:square\}/)
  assert.match(sheet, /::-webkit-scrollbar-thumb/)
  // Every rule is scoped: an unscoped rule would repaint light and dark too.
  for (const rule of sheet.split('}').filter(part => part.trim().length > 0)) {
    const selector = rule.split('{')[0] ?? ''
    assert.ok(
      selector.includes('data-dsw-win2k') || selector.startsWith('@'),
      `unscoped rule: ${selector}`,
    )
  }
})

test('the scope attribute follows the active theme and is retracted on unload', () => {
  const harness = mount()
  // Mounted under the default light palette: the attribute is off, so the
  // sheet is inert until the user picks the theme.
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)

  harness.publish('win2k')
  assert.equal(harness.attributes.get('data-dsw-win2k'), true)

  harness.publish('dark')
  assert.equal(harness.attributes.get('data-dsw-win2k'), false)

  harness.publish('win2k')
  harness.dispose()
  assert.equal(harness.attributes.get('data-dsw-win2k'), undefined)
})

test('the node half mounts without a context and registers nothing model-facing', () => {
  // It exists so the Loader row has a module; the theme is the browser half.
  assert.equal(applyHost(), undefined)
})
