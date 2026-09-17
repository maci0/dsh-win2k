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
export const name = 'win2k';
/**
 * Settings namespace the browser cube edits — the join key between this host
 * half and `lib/client.js`.
 */
export const WIN2K_SETTINGS_NAMESPACE = 'win2k';
/**
 * Persisted configuration. `selected` is the plugin's own flag rather than the
 * theme service's preference: the `ui-theme` document holds built-in ids only,
 * and a third-party id cannot be written there.
 */
export const Win2kSettings = Schema.object({
    selected: Schema.boolean().default(false),
});
/**
 * Row-config default for `selected`: off, because the cube is the switch.
 */
const DEFAULT_SELECTED = false;
/** Row schema: the default lives here, so a deployment only states what it changes. */
export const Config = Schema.object({
    selected: Schema.boolean().default(DEFAULT_SELECTED),
});
/**
 * Mount the plugin.
 * @param ctx - the host context.
 * @param config - optional row configuration.
 */
export function apply(ctx, config = {}) {
    // Reject configuration that would silently do the wrong thing.
    if (config.selected !== undefined && typeof config.selected !== 'boolean') {
        throw new Error(`[win2k] selected must be a boolean; got ${JSON.stringify(config.selected)}`);
    }
    const startup = config.selected ?? DEFAULT_SELECTED;
    ctx.inject(['settings'], (scope) => {
        scope.settings.installSection(ctx, WIN2K_SETTINGS_NAMESPACE, Win2kSettings, { selected: startup }, 
        // The browser half owns every consequence of this value; the node half
        // only stores it, so both hooks stay empty on purpose.
        { setSource: () => { }, onChange: () => { } });
    });
}
