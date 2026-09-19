/**
 * Counting stub DOM for the win2k browser half.
 *
 * The bundle is a lazy-CJS factory on `window.__ModuleLoader__`, so it is
 * evaluated exactly the way the client module system loads it — no browser, no
 * network, no server. What this harness returns is the work the shipped code
 * actually performed (DOM writes, element allocations, style-parse bytes,
 * teardown calls) and the surfaces it registered. The bench script, the perf
 * gates and the behaviour tests all drive it.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Everything the shipped half can move, counted. */
export interface Counters {
  /** `<style>` elements appended to head (the CSS parse handed to the engine). */
  headAppend: number
  /** Bytes of CSS text assigned to that element's `textContent`. */
  cssBytes: number
  /** Elements the shipped code asked the document to create. */
  createElement: number
  /** `body.toggleAttribute` calls — one per settings snapshot. */
  toggleAttribute: number
  /** `body.removeAttribute` calls — one per unload. */
  removeAttribute: number
  /** `React.createElement` calls (the cube row's element allocations). */
  reactElement: number
  /** Token layers stacked / retracted through `ctx.theme.overrideTokens`. */
  layerStacked: number
  layerRetracted: number
  /** Settings writes the cube asked for. */
  settingsSet: number
}

/** One settings row the bundle registered into a slot. */
export interface RegisteredRow {
  entry: Record<string, unknown>
  component: () => unknown
}

/** A bound harness over one evaluated bundle. */
export interface Harness {
  counters: Counters
  /** Tokens of every layer currently stacked, keyed by layer source. */
  layers: Map<string, Record<string, { light: string; dark: string }>>
  /** CSS text of every `<style>` tag the bundle appended, in order. */
  appended: string[]
  /** Live `body` attribute state the chrome scope toggles. */
  attributes: Map<string, boolean>
  /** Settings writes the cube asked for, as `[field, value]` pairs. */
  writes: unknown[][]
  /** Locale namespaces the bundle registered. */
  locales: string[]
  /** Slot rows the bundle registered, in order. */
  rows: RegisteredRow[]
  /** The id and `inject` list the bundle published. */
  registration: { id: string; inject: readonly string[] }
  /** Drive `count` settings snapshots through the plugin's subscription. */
  publish(count: number, selected: (index: number) => boolean): void
  /** Render every registered row `count` times. */
  renderRow(count: number): void
  /** Drop the plugin the way an unload does. */
  dispose(): void
}

/** Snapshot shape the settings scope serves. */
export interface Snapshot {
  status: string
  value: unknown
  writable: boolean
}

/** Read the shipped browser artifact. */
export function readBundle(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'client.js'), 'utf8')
}

/** React stub with the only two entry points the bundle uses. */
function createReactStub(onElement: () => void): { createElement: unknown, useSyncExternalStore: unknown } {
  return {
    createElement: (type: unknown, props: unknown, ...children: unknown[]): unknown => {
      onElement()
      return { type, props: props ?? {}, children: children.flat() }
    },
    useSyncExternalStore: (_subscribe: unknown, getSnapshot: () => unknown): unknown => getSnapshot(),
  }
}

/** What the bundle publishes on `window.__ModuleLoader__`. */
interface Registration {
  id: string
  factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void; inject: readonly string[] }
}

/**
 * Evaluate `source` against the counting stub and apply the plugin.
 * @param source - the bundle source (a variant is allowed).
 * @param initial - the settings snapshot the mount starts from.
 */
export function mount(source: string, initial: Snapshot): Harness {
  const counters: Counters = {
    headAppend: 0,
    cssBytes: 0,
    createElement: 0,
    toggleAttribute: 0,
    removeAttribute: 0,
    reactElement: 0,
    layerStacked: 0,
    layerRetracted: 0,
    settingsSet: 0,
  }
  const layers = new Map<string, Record<string, { light: string; dark: string }>>()
  const appended: string[] = []
  const attributes = new Map<string, boolean>()
  const writes: unknown[][] = []
  const locales: string[] = []
  const rows: RegisteredRow[] = []
  const listeners: ((snapshot: Snapshot) => void)[] = []
  const disposers: (() => void)[] = []
  let current = initial

  const react = createReactStub(() => { counters.reactElement += 1 })
  const scope = {
    subscribe: (listener: (snapshot: Snapshot) => void): (() => void) => { listeners.push(listener); return () => {} },
    getSnapshot: (): Snapshot => current,
    set: (field: string, value: unknown): Promise<void> => {
      counters.settingsSet += 1
      writes.push([field, value])
      return Promise.resolve()
    },
  }
  const theme = {
    overrideTokens: (id: string, tokens: Record<string, { light: string, dark: string }>): (() => void) => {
      counters.layerStacked += 1
      layers.set(id, tokens)
      return () => { counters.layerRetracted += 1; layers.delete(id) }
    },
  }
  const ctx = {
    theme,
    locale: {
      register: (namespace: string): (() => void) => { locales.push(namespace); return () => {} },
      bind: (): ((key: string) => string) => (key: string) => key,
    },
    settingsScope: { bind: () => scope },
    effect: (callback: () => unknown): unknown => {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer as () => void)
      return disposer
    },
    slots: {
      inject: (_name: string, callback: () => unknown): void => { callback() },
      register: (entry: Record<string, unknown>, component: () => unknown): (() => void) => {
        rows.push({ entry, component })
        return () => {}
      },
    },
  }
  const documentStub = {
    body: {
      toggleAttribute: (name: string, on: boolean): void => { counters.toggleAttribute += 1; attributes.set(name, on) },
      removeAttribute: (name: string): void => { counters.removeAttribute += 1; attributes.delete(name) },
    },
    createElement: (): { textContent: string } => {
      counters.createElement += 1
      let css = ''
      return {
        get textContent(): string { return css },
        set textContent(value: string) { counters.cssBytes += value.length; css = value },
      }
    },
    head: {
      append: (element: { textContent: string }): void => {
        counters.headAppend += 1
        appended.push(element.textContent)
      },
    },
  }
  const windowStub = { __ModuleLoader__: { load: (_registration: unknown): void => {} } }
  const requireFn = (id: string): unknown => {
    if (id !== 'react') throw new Error(`unexpected require: ${id}`)
    return react
  }

  let loaded: Registration | undefined
  windowStub.__ModuleLoader__.load = (registration: unknown): void => {
    loaded = registration as Registration
  }
  new Function('window', 'require', 'document', source)(windowStub, requireFn, documentStub)
  if (!loaded) throw new Error('the bundle did not register itself')
  const exported = loaded.factory(requireFn)
  exported.apply(ctx)

  return {
    counters,
    layers,
    appended,
    attributes,
    writes,
    locales,
    rows,
    registration: { id: loaded.id, inject: exported.inject },
    publish: (count: number, selected: (index: number) => boolean): void => {
      for (let i = 0; i < count; i += 1) {
        current = { status: 'ready', value: { selected: selected(i) }, writable: true }
        for (const listener of listeners) listener(current)
      }
    },
    renderRow: (count: number): void => {
      for (let i = 0; i < count; i += 1) for (const row of rows) row.component()
    },
    dispose: (): void => { for (const disposer of disposers.reverse()) disposer() },
  }
}
