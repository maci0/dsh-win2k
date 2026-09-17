/**
 * dsh-win2k — Windows 2000 theme, as a DeepSeek Harness plugin.
 *
 * The palette lives in the browser half: `lib/client.js` registers a
 * `ctx.theme` definition whose alias-token overrides repaint the Web client in
 * the Windows 2000 registry colours, appends the chrome a token cannot express
 * (square corners, MS Sans Serif, the beveled scrollbar), and renders the card
 * in Settings → Plugins → Plugin configuration.
 *
 * This node half exists for one reason: the Plugin configuration tab renders
 * one card per settings namespace the Host serves, so the `win2k` namespace
 * registered here is what makes the card appear — and what makes the on/off
 * choice survive a restart. It touches nothing model-facing.
 *
 * @module dsh-win2k
 */

import z from '@deepseek-ai/schemastery'

/** Plugin name as it appears in the loader. */
export const name = 'win2k'

/**
 * Settings namespace the browser card edits — the join key between this host
 * half and `lib/client.js`. The card registers into `settings.plugin.item`
 * under the same key, and the tab pairs the two without knowing what it means.
 */
export const WIN2K_SETTINGS_NAMESPACE = 'win2k'

/** Persisted configuration: whether the theme is forced on. */
export const Win2kSettings = z.object({
  enabled: z.boolean().default(true),
})

/**
 * Configuration accepted from this plugin's row in a profile patch.
 *
 * No Schemastery `Config` schema is exported: the loader would require a
 * Standard Schema for it, and this plugin validates its own row instead so the
 * loader never has to.
 */
export interface Config {
  /** Startup state. Defaults to `true`: adding the row is asking for the theme. */
  readonly enabled?: boolean
}

/** The slice of the settings service this plugin uses. */
export interface SettingsServiceLike {
  /**
   * Register a namespace with the plugin's composition entry as the `base`
   * layer, falling back to that entry when no provider is mounted.
   */
  installSection(
    owner: unknown,
    namespace: string,
    schema: unknown,
    entry: unknown,
    hooks: {
      setSource(current: () => unknown): void
      onChange(): void
    },
  ): void
}

/** Hooks the host context exposes to this plugin. */
export interface HostContext {
  /** Run `callback` once the named services are available. */
  inject(dependencies: readonly string[], callback: (scope: HostContext) => void): unknown
  readonly settings: SettingsServiceLike
}

/**
 * Mount the plugin.
 * @param ctx - the host context.
 * @param config - optional row configuration.
 */
export function apply(ctx: HostContext, config: Config = {}): void {
  // Reject configuration that would silently do the wrong thing.
  if (config.enabled !== undefined && typeof config.enabled !== 'boolean') {
    throw new Error(`[win2k] enabled must be a boolean; got ${JSON.stringify(config.enabled)}`)
  }

  const startup = config.enabled ?? true

  ctx.inject(['settings'], (scope) => {
    scope.settings.installSection(
      ctx,
      WIN2K_SETTINGS_NAMESPACE,
      Win2kSettings,
      { enabled: startup },
      // The browser half owns every consequence of this value; the node half
      // only stores it, so both hooks stay empty on purpose.
      { setSource: () => {}, onChange: () => {} },
    )
  })
}
