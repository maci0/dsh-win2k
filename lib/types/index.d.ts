/**
 * dsh-win2k: Windows 2000 theme, as a DeepSeek Harness plugin.
 *
 * Two halves, both on public Cordis extension points:
 *
 * - the browser half (`lib/client.js`) stacks a `ctx.theme.overrideTokens`
 *   layer that repaints the Web client in the Windows 2000 registry colours,
 *   and appends the chrome a token cannot express (square corners, MS Sans
 *   Serif, the beveled scrollbar);
 * - this host half declares the `win2k` settings namespace that makes the
 *   choice persistent. The browser half's own cube in Settings → General sits
 *   directly under the built-in Appearance cubes and writes it.
 *
 * The stock Appearance row renders three hardcoded cubes and the durable theme
 * schema accepts only `light`/`dark`/`system`, so a third-party theme cannot
 * enter that row from outside core. This plugin therefore draws its own cube
 * through the public `settings.general.item` slot and keeps the choice in its
 * own namespace: no core change, and no second copy of another plugin's
 * control.
 *
 * @module dsh-win2k
 */
import type { Context, Volatile } from '@deepseek-ai/cordis';
import Schema from '@deepseek-ai/schemastery';
/** Plugin name as it appears in the loader. */
export declare const name = "win2k";
/**
 * Settings namespace the browser cube edits: the join key between this host
 * half and `lib/client.js`.
 */
export declare const WIN2K_SETTINGS_NAMESPACE = "win2k";
/**
 * Configuration accepted from this plugin's row in a profile patch.
 *
 * `selected` is the plugin's own flag rather than the theme service's
 * preference: the `ui-theme` document holds built-in ids only, and a
 * third-party id cannot be written there.
 *
 * The field is spelled once: the settings namespace validates the stored value
 * against this schema and Cordis validates the row patch against the same
 * object, so the two can never drift. It defaults to `false`: the cube is the
 * switch.
 */
export declare const Config: Schema<Schemastery.ObjectS<NoInfer<{
    selected: Schema<boolean, boolean, "volatile-defined">;
}>>, Schemastery.ObjectT<NoInfer<{
    selected: Schema<boolean, boolean, "volatile-defined">;
}>>, "plain">;
/** Configuration this plugin's row resolves to. */
export interface Config {
    /** Start with the theme applied. The schema default fills `false`. */
    readonly selected: Volatile<boolean>;
}
/**
 * Mount the plugin. The host half registers nothing: the row's volatile
 * `selected` is the stored switch, and the browser half reads it.
 * @param _ctx - the host context.
 * @param _config - the row configuration.
 */
export declare function apply(_ctx: Context, _config: Config): void;
