/**
 * dsh-win2k — Windows 2000 theme, as a DeepSeek Harness plugin.
 *
 * The whole plugin is the browser half (`lib/client.js`): it registers a
 * `ctx.theme` definition whose alias-token overrides repaint the Web client in
 * the Windows 2000 registry colours, and appends the chrome a token cannot
 * express (square corners, MS Sans Serif, the beveled scrollbar). The
 * Appearance row in Settings → General lists registered themes, so
 * `Windows 2000` appears there beside light/dark/system and persists like any
 * other choice.
 *
 * This node half exists because a Loader row names a package, and the package
 * needs a module to load. It registers nothing model-facing and owns no state.
 *
 * @module dsh-win2k
 */

/** Plugin name as it appears in the loader. */
export const name = 'win2k'

/** Mount the plugin: intentionally empty — the theme lives in the browser half. */
export function apply(): void {}
