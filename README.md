# dsh-win2k

A working agent UI wearing 2000-era chrome.

Grey face panels, a white document well, navy selection, hard-square corners, MS Sans Serif — repainted live inside the Web client. No fork, no core patch: a token layer plus one stylesheet.

## What you get

- **The palette.** The Windows 2000 registry colour set (`HKCU\Control Panel\Colors`: ButtonFace `#d4d0c8`, ActiveTitle `#0a246a`, Window `#ffffff`, GrayText `#808080`, ButtonDkShadow `#404040`, InfoWindow `#ffffe1`) mapped onto the `--dsw-alias-*` tokens, taken from the win2k sheets this author's other projects ship (`clanker/themes/win2k.json`). Tooltips and toasts get ActiveTitle navy; code blocks get a white client area with a grey banner.
- **The chrome tokens cannot spell.** Square corners, `MS Sans Serif` body text with Lucida Console code, navy `::selection`, a black-framed 1px hard shadow where the base sheet blurs, and the 16px beveled dithered scrollbar. Firefox takes the standard `scrollbar-color` path instead of the WebKit dither.
- **A Theme row in Settings → General.** One **Windows 2000** cube, sitting directly under the built-in Appearance cubes, wearing their chrome and geometry. It is a switch, not a fourth Appearance option.
- **A choice that survives a reload.** Stored in this plugin's own `win2k` settings namespace, not in the durable theme preference.

## Install

```sh
dsh plugin --profile web add github:maci0/dsh-win2k
```

The package declares `dsh.bundle`, so the CLI appends it to `dsh.profile.bundles` and applies its own `cordis.patch.yml` as a layer. Refresh later with:

```sh
dsh plugin --profile web update dsh-win2k
```

Then **restart `dsh web`** — bundle layers compose at boot.

Do not also insert the row by hand into your profile's `cordis.patch.yml` while the package is in `dsh.profile.bundles`: `insert` does not dedupe ids, and a second row mounts the plugin twice. To change the startup value instead, override the row in the profile patch — `- id: win2k` replaces the whole `config`.

## Use it

Settings → General → Theme → **Windows 2000**.

Visible on click: panels and sidebar go `#d4d0c8` grey, the transcript column goes white, buttons and links go navy, every corner squares off, body text turns MS Sans Serif, and scrollbars grow to 16px with a dithered track and a raised thumb.

Click it again to turn the skin off. The previous Light/Dark/System choice is still selected underneath — this layer never moved it.

## Configure

| Field | Type | Default | Meaning |
|---|---|---|---|
| `selected` | `boolean` | `false` | Start with the skin applied. The cube is the switch, so the default is off. |

The bundled `cordis.patch.yml` ships `selected: true`, so a fresh `dsh plugin add` starts skinned. The value lives in the `win2k` settings namespace; a deployment that cannot persist settings still applies the cube for the session.

## How it works

`ctx.theme.overrideTokens('win2k', …)` stacks a token layer above whatever built-in theme the user picked, with a `{ light, dark }` pair per token. Windows 2000 had one scheme, so both entries repeat the same value — the skin must not go illegible because the underlying preference is dark. Light/Dark/System keep working below it; the win2k colours win on top.

The layer is the only shape that sticks. The durable `ui-theme` preference schema accepts built-in ids only (`light`/`dark`/`system`), so a third-party registered id could never be the persisted preference: the document kept saying light while the in-memory preference said win2k, and the skin lost to every settings write and reload. Release v0.4.1 replaced that with the override layer, owned by this plugin's own `selected` flag.

The chrome sheet is scoped under `body[data-dsw-win2k]`, the attribute the browser half toggles from that same flag, so the sheet is inert while the skin is off. The module system claims the `<style>` tag while the package materializes and disposes it on unload, along with the token layer.

The row registers into `settings.general.item` at **order 12**, directly under ui-theme's Appearance row at order 10. Injecting into the slot waits for its owner, so load order does not matter. A deployment whose settings service does not serve this namespace renders no row at all.

## Deliberately not included

- **The win2k cursors.** The reference set is twelve SVG data-URL pointers (`%SystemRoot%\cursors`, hotspots included) — a screenful of string noise for a pointer most users never notice.
- **Title bar, taskbar, Start menu, common dialogs.** This page has no such markup.
- **Period metrics.** 16px touch targets and 23px push buttons would fight the client's own minimums and keyboard affordances.
- **A focus-ring restyle.** A 1px dotted rect is period-correct and too faint to be the only keyboard affordance here; the client's own ring stays.
- **A Plugins-tab card.** The cube is the switch; a second control in Plugin configuration would be a duplicate with its own state.

## Development

```sh
npm run build      # tsc -p tsconfig.build.json → lib/index.js + lib/types/
npm test           # node --test tests/*.test.ts — 7 behavioural tests
npm run typecheck  # tsc -p tsconfig.json
```

`lib/client.js` is hand-authored and the build does not touch it. It is plain JavaScript on purpose: the client module system serves a package's `exports["./client"]` artifact as a lazy-CJS factory registered on `window.__ModuleLoader__`, so an out-of-tree plugin can author it directly instead of reproducing the repository's client preset.

The tests evaluate the shipped bundle the way the client module system loads it, and cover the token layer, the sheet scope, flag-driven retraction on unload, row ordering, and the host settings namespace. None of them prove the *look* — that needs a browser.

## Licence

MIT.
