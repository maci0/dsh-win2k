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
import Schema from '@deepseek-ai/schemastery';
/** Plugin name as it appears in the loader. */
export declare const name = "win2k";
/**
 * Settings namespace the browser cube edits — the join key between this host
 * half and `lib/client.js`.
 */
export declare const WIN2K_SETTINGS_NAMESPACE = "win2k";
/**
 * Persisted configuration. `selected` is the plugin's own flag rather than the
 * theme service's preference: the `ui-theme` document holds built-in ids only,
 * and a third-party id cannot be written there.
 *
 * The field is spelled once: the settings namespace validates the stored value
 * against this schema and `Config` below is the same object for a row patch, so
 * the two can never drift. It defaults to `false` — the cube is the switch.
 */
export declare const Win2kSettings: Schema<Schemastery.ObjectS<{
    selected: Schema<boolean, boolean>;
}>, Schemastery.ObjectT<{
    selected: Schema<boolean, boolean>;
}>>;
/**
 * Configuration accepted from this plugin's row in a profile patch.
 *
 * The exported schema is what Cordis validates the row against and fills
 * defaults from; `apply` keeps its own check as a backstop for direct callers.
 */
export interface Config {
    /** Start with the theme applied. Defaults to `false`: the cube is the switch. */
    readonly selected?: boolean;
}
/** Row schema: the settings namespace's own schema, so the default lives once. */
export declare const Config: Schema<Config>;
/** The slice of the settings service this plugin uses. */
export interface SettingsServiceLike {
    /**
     * Register a namespace with the plugin's composition entry as the `base`
     * layer, falling back to that entry when no provider is mounted.
     */
    installSection(owner: unknown, namespace: string, schema: unknown, entry: unknown, hooks: {
        setSource(current: () => unknown): void;
        onChange(): void;
    }): void;
}
/** Hooks the host context exposes to this plugin. */
export interface HostContext {
    /** Run `callback` once the named services are available. */
    inject(dependencies: readonly string[], callback: (scope: HostContext) => void): unknown;
    readonly settings: SettingsServiceLike;
}
/**
 * Mount the plugin.
 * @param ctx - the host context.
 * @param config - optional row configuration.
 */
export declare function apply(ctx: HostContext, config?: Config): void;
