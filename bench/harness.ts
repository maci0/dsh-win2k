/**
 * Counting stub DOM for the win2k browser half.
 *
 * The bundle is a lazy-CJS factory on `window.__ModuleLoader__`, so it is
 * evaluated exactly the way the client module system loads it — no browser, no
 * network, no server. What this harness returns is the work the shipped code
 * actually performed: DOM writes, element allocations, style-parse bytes and
 * teardown calls. Both the bench script and the perf test drive it.
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
  /**
   * Whole-sheet string rewrites performed while the module materializes. The
   * sheet ships pre-normalized, so this stays `0`; a re-introduced runtime
   * normalizer is a sheet-sized copy per page load, and the count catches it on
   * any machine, loaded or not.
   */
  sheetRewrites: number
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

/** A bound harness over one evaluated bundle. */
export interface Harness {
  counters: Counters
  /** Tokens of every layer currently stacked, keyed by layer source. */
  layers: Map<string, Record<string, { light: string; dark: string }>>
  /** Drive `count` settings snapshots through the plugin's subscription. */
  publish(count: number, selected: (index: number) => boolean): void
  /** Render the registered settings row `count` times. */
  renderRow(count: number): void
  /** Whether the row registered at least one component. */
  hasRow(): boolean
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

/**
 * Evaluate `source` against the counting stub and apply the plugin.
 * @param source - the bundle source (a variant is allowed).
 * @param initial - the settings snapshot the mount starts from.
 */
export function mount(source: string, initial: Snapshot): Harness {
  const counters: Counters = {
    headAppend: 0,
    cssBytes: 0,
    sheetRewrites: 0,
    createElement: 0,
    toggleAttribute: 0,
    removeAttribute: 0,
    reactElement: 0,
    layerStacked: 0,
    layerRetracted: 0,
    settingsSet: 0,
  }
  const layers = new Map<string, Record<string, { light: string; dark: string }>>()
  const rows: (() => unknown)[] = []
  const listeners: ((snapshot: Snapshot) => void)[] = []
  const disposers: (() => void)[] = []
  let current = initial

  const react = createReactStub(() => { counters.reactElement += 1 })
  const scope = {
    subscribe: (listener: (snapshot: Snapshot) => void): (() => void) => { listeners.push(listener); return () => {} },
    getSnapshot: (): Snapshot => current,
    set: (): Promise<void> => { counters.settingsSet += 1; return Promise.resolve() },
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
    locale: { register: (): (() => void) => () => {}, bind: (): ((key: string) => string) => (key: string) => key },
    settingsScope: { bind: () => scope },
    effect: (callback: () => unknown): unknown => {
      const disposer = callback()
      if (typeof disposer === 'function') disposers.push(disposer as () => void)
      return disposer
    },
    slots: {
      inject: (_name: string, callback: () => unknown): void => { callback() },
      register: (_entry: unknown, component: () => unknown): (() => void) => { rows.push(component); return () => {} },
    },
  }
  const documentStub = {
    body: {
      toggleAttribute: (): void => { counters.toggleAttribute += 1 },
      removeAttribute: (): void => { counters.removeAttribute += 1 },
    },
    createElement: (): { textContent: string } => {
      counters.createElement += 1
      let css = ''
      return {
        get textContent(): string { return css },
        set textContent(value: string) { counters.cssBytes += value.length; css = value },
      }
    },
    head: { append: (): void => { counters.headAppend += 1 } },
  }
  const windowStub = { __ModuleLoader__: { load: (_registration: unknown): void => {} } }
  const requireFn = (id: string): unknown => {
    if (id !== 'react') throw new Error(`unexpected require: ${id}`)
    return react
  }

  let loaded: { factory: (require: (id: string) => unknown) => { apply: (ctx: unknown) => void } } | undefined
  windowStub.__ModuleLoader__.load = (registration: unknown): void => {
    loaded = registration as typeof loaded
  }
  // Watch the one string-sized operation the sheet could reappear in. Sheets
  // below the floor are ordinary work and are not counted.
  const SHEET_FLOOR = 100_000
  const nativeReplace = String.prototype.replace
  String.prototype.replace = function counted(
    this: string,
    ...rest: unknown[]
  ): string {
    if (typeof this === 'string' && this.length >= SHEET_FLOOR) counters.sheetRewrites += 1
    return (nativeReplace as unknown as (...args: unknown[]) => string).apply(this, rest)
  } as typeof String.prototype.replace
  try {
    new Function('window', 'require', 'document', source)(windowStub, requireFn, documentStub)
    if (!loaded) throw new Error('the bundle did not register itself')
    loaded.factory(requireFn).apply(ctx)
  } finally {
    String.prototype.replace = nativeReplace
  }

  return {
    counters,
    layers,
    publish: (count: number, selected: (index: number) => boolean): void => {
      for (let i = 0; i < count; i += 1) {
        current = { status: 'ready', value: { selected: selected(i) }, writable: true }
        for (const listener of listeners) listener(current)
      }
    },
    renderRow: (count: number): void => {
      for (let i = 0; i < count; i += 1) for (const row of rows) row()
    },
    hasRow: (): boolean => rows.length > 0,
    dispose: (): void => { for (const disposer of disposers.reverse()) disposer() },
  }
}
