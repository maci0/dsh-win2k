/**
 * dsh-win2k — Windows 2000 theme, as a DeepSeek Harness plugin.
 *
 * Two capabilities, both on public Cordis extension points:
 *
 * - the browser half registers a `ctx.theme` definition whose alias-token
 *   overrides repaint the Web client in the Windows 2000 registry colours, and
 *   appends the chrome a token cannot express (square corners, MS Sans Serif,
 *   the beveled scrollbar);
 * - the `win2k` settings namespace makes the choice persistent and pairs with
 *   the browser half's own cube in Settings → General, which sits directly
 *   under the built-in Appearance cubes and wears the same cube chrome.
 *
 * The stock Appearance row renders three hardcoded cubes and the durable theme
 * schema accepts only `light`/`dark`/`system`, so a registered theme cannot
 * enter that row from outside core. This plugin therefore draws its own cube
 * through the public `settings.general.item` slot and keeps the choice in its
 * own namespace — no core change, and no second copy of another plugin's
 * control.
 *
 * @module dsh-win2k
 */

import Schema from '@deepseek-ai/schemastery'

/** Plugin name as it appears in the loader. */
export const name = 'win2k'

/**
 * Settings namespace the browser cube edits — the join key between this host
 * half and `lib/client.js`.
 */
export const WIN2K_SETTINGS_NAMESPACE = 'win2k'

/**
 * Configuration accepted from this plugin's row in a profile patch.
 *
 * `selected` is the plugin's own flag rather than the theme service's
 * preference: the `ui-theme` document holds built-in ids only, and a
 * third-party id cannot be written there.
 *
 * The field is spelled once: the settings namespace validates the stored value
 * against this schema and Cordis validates the row patch against the same
 * object, so the two can never drift. It defaults to `false` — the cube is the
 * switch.
 */
export const Config = Schema.object({
  selected: Schema.boolean().default(false).volatile(),
})

/** Configuration accepted from this plugin's row in a profile patch. */
export interface Config {
  /** Start with the theme applied. Defaults to `false`. Volatile on v0.1.7. */
  readonly selected?: boolean | { readonly value: boolean | undefined }
}

/** The slice of the settings service this plugin uses. */
export interface SettingsServiceLike {
  /** Merge fields into one profile entry. `ns` is the entry id. */
  update(ns: string, patch: Record<string, unknown>): Promise<void>
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
  // Volatile `selected` is the stored switch. The browser half reads the row.
  void ctx
  void config
}
