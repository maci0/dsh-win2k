# dsh-win2k

A working agent UI wearing 2000-era chrome.

Grey face panels, a white document well, navy selection, hard-square corners, MS Sans Serif — repainted live inside the Web client. No fork, no core patch: a token layer plus one stylesheet.

## What you get

- **The palette.** The Windows 2000 registry colour set (`HKCU\Control Panel\Colors`: ButtonFace `#d4d0c8`, ActiveTitle `#0a246a`, Window `#ffffff`, GrayText `#808080`, ButtonDkShadow `#404040`, InfoWindow `#ffffe1`) mapped onto the `--dsw-alias-*` tokens, taken from the win2k sheets this author's other projects ship (`clanker/themes/win2k.json`). Every `--dsw-static-*` step of every ramp is set to the same system palette, so no component falls through to the modern set. Code blocks get a white client area with a grey banner; tooltips get the InfoWindow `#ffffe1` well.
- **The chrome tokens cannot spell.** Square corners, `MS Sans Serif` body text with Lucida Console code, navy `::selection`, a black-framed 1px hard shadow where the base sheet blurs, and the 16px beveled dithered scrollbar. Firefox takes the standard `scrollbar-color` path instead of the WebKit dither. The 2px 3D edges and the sunken wells are `box-shadow` insets, so no bevel changes padding or border-width.
- **Faces where the DOM has one.** The 3D edge is spent on the things Windows 2000 actually raised — push buttons, combo boxes, menus, dialogs, InfoTips, the tab control — and the title bar takes ActiveTitle navy. Rails, headers, the Explorer tree, the tab strip and the chat's tool rows stay flat, because a wall of raised plates is not the look. See the mapping table below for which element gets which.
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

Visible on click: panels and sidebar go `#d4d0c8` grey, the transcript column goes white, links go navy, every corner squares off, body text turns MS Sans Serif, and scrollbars grow to 16px with a dithered track and a raised thumb. The Session header becomes a navy title bar with white ink; push buttons wear the 2px raised edge and sink when pressed; inputs, composer and code sit in sunken white wells; the session tree and the Settings rail select in navy; menus, dialogs, the tab control, InfoTips and separators take their period shapes; toolbar, tree and tool-row buttons stay flat until the pointer is on them.

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

## Windows 2000 mapping

Windows 2000 is defined by its 2px 3D edges, sunken wells, square corners, hard (unblurred) shadows, navy selection and instant transitions. CSS-module class names are hashed, so the sheet reaches the client through tokens, role/attribute selectors and element selectors only. Every bevel is a `box-shadow` inset pair held in the sheet's own `--dw-raised` / `--dw-sunken`, so no rule changes padding, font, size or border-width.

The split between a raised plate and a flat row is the whole look, and it was checked against the DOM the client really renders in this build — counts below are `document.querySelectorAll` matches in the live Web client with the skin on (a blank Session, a running Session, and the Settings dialog).

| DSH surface (selector) | Windows 2000 counterpart | How it is done |
|---|---|---|
| Push buttons (`button`, `[role="button"]`, `kbd`) — 60 buttons rendered, every one a real action | ButtonFace `#d4d0c8` with the 2px raised edge and square corners | Rule: face background plus `box-shadow: var(--dw-raised)`. |
| Flat chrome: `nav`, `header`, `[role="tree"]`, `[role="treeitem"]`, `[role="toolbar"]`, `[role="tablist"]`, `[role="menu"]`, `[role="listbox"]`, `[data-dockkit-strip]` descendants, and the chat's tool rows (`button[data-turn-process]`, one per Think/Read/Edit/Bash line) | A win2k toolbar, rail and list draw no face at rest; only pressable things are raised | Rule: transparent, no shadow, with `:where()` keeping the specificity equal to the plate rule so a component's own hover/selected rule still wins. Toolbar buttons inside `header` / `[role="toolbar"]` / tab strips get the raised edge back on `:hover`. |
| Session title bar (`header:has([data-conversation-header-leading]) > :first-child`, plus its descendants) | The ActiveTitle `#0a246a` caption bar with white ink | Rule: navy background and white foreground; `:has()` is already used 49 times in the client's own CSS, so it needs no fallback. |
| Current rail row (`nav button[aria-current]`) | Highlight `#0a246a` selection with white ink | Rule: navy plate, white foreground, beating the component's own pale-blue `.active` class. Token: `--dsw-specific-sidebar-nav-item-active` is navy. |
| Inputs, composer, code blocks (`input` except checkbox/radio/range/file, `textarea`, `select`, `pre`, `:not(pre) > code`) | Sunken white field (one `textarea` in the blank Session, plus `select` in Settings) | Rule: white background plus `box-shadow: var(--dw-sunken)`; `--dsw-alias-bg-base`, `--dsw-specific-input-major`, `--dsw-alias-markdown-code-block` are white. |
| Buttons pressed, toggles on (`button:active`, `[role="button"]:active`, `[aria-pressed="true"]`) | Sunken, content nudged 1px | Rule: `var(--dw-sunken)` plus `transform: translate(1px,1px)` (no layout shift). |
| Explorer tree (`[role="treeitem"]` — 44 in the client, 22 rendered at once) | Win2k tree view | Rule: square and transparent at rest, hover `#e4e1dc`, `[aria-selected="true"]` navy `#0a246a` with white ink on the row and everything in it, `:focus-visible` 1px dotted black inset outline. Tokens: `--dsw-specific-sidebar-*`. |
| Menus (`[role="menu"]`, `[role="menuitem"]`, `[role="menuitemradio"]`) | Win2k menu popup | Rule: face plus raised edge plus hard 2px black-alpha shadow on the popup; items flat, hover/focus navy with white ink. Token: `--dsw-specific-menu`. Verified on the model/effort popup. |
| Dialogs (`[role="dialog"]` — 13 in the client) | Win2k dialog | Rule: face, raised edge, hard `2px 2px 0 rgba(0,0,0,.35)` shadow. No caption rule: no dialog in the client renders a `<header>` (or any caption element) as a direct child, so a `> header` rule would never match; the Settings rail's navy current row carries the period colour instead. |
| Tab control (`[role="tablist"]` 4, `[role="tab"]` 5, `button[role="tab"]` in the Session header and in dockkit panes) | Grey tab strip; unselected tab raised on the face, selected tab joins the page in white | Rules: the strip takes the face colour, an unselected tab gets a 1px raised edge, `[aria-selected="true"]` goes white with black ink and no bottom edge, and the modern 2px indicator bar (`::after`) is nulled. |
| Tooltips (`[role="tooltip"]` — 4 uses, verified live) | InfoTip | Rule: `#ffffe1` background, black ink, square, `box-shadow: 0 0 0 1px #000000` frame instead of a border, no blur or big shadow. |
| Status/alert toasts (`[role="alert"]` — 36 uses) | Win2k message box / toast | Rule: face, raised edge, hard 2px shadow. Only `[role="alert"]` is styled: `[role="status"]` is also the full-screen drop-overlay mask (`ui-attachment/src/DropOverlay.tsx`), which a face background would hide, so that half of the row is left to the tokens. |
| Switches (`[role="switch"]` — 2 uses, `ui-primitives/src/Switch.tsx` renders the track as the `<button>` and the marker as its last `<span>`) | No win2k switch: off raised, on sunken with a navy marker | Rule: track `var(--dw-raised)` at rest, `#ffffff` with `var(--dw-sunken)` when checked; the marker (`> span:last-child`) is squared and goes from white to navy `#0a246a`. Not on screen in General, so it is matched by role, not by a live check. |
| Checkboxes (`input[type="checkbox"]`) and `select` | 13px sunken white well with a black tick; sunken well with a small raised arrow area | Rules: `appearance: none`, `13px` box, white background, `var(--dw-sunken)`, one inline SVG tick when checked; `select` reuses the well and adds one SVG data-URI arrow plate. No checkbox or `select` element is rendered by this build, so both are defensive. |
| `hr`, `[role="separator"]` (2 uses) | Etched line, 1px `#808080` over 1px `#ffffff` | Rule: `hr` recolours its existing 1px border (grey top, white bottom) without touching border-width; the separator paints a 2px etched gradient as its background image. |
| Markdown `table` (`th`, `td`), `pre`, `code` | Grey grid with a raised header face; sunken code well with a ButtonFace banner | Rule: `th`/`td` borders recoloured `#808080`, `th` gets face plus raised edge; `pre` and inline `code` get the sunken white well. Token: `--dsw-alias-markdown-code-block-banner` is ButtonFace. |
| `::selection`, scrollbars | Navy selection, dithered track, raised thumb | Rule: `::selection` navy/white, WebKit track dithered, thumb raised. Tokens: `--dsw-alias-scrollbar-bg-l1/l2` and `-hover-l1/l2`, plus `--dsh-scrollbar-thumb`, `-thumb-hover`, `-track-margin`. Measured 16px of scrollbar gutter in the session list. |
| Elevation, shadow, transition knobs | Hard edges and instant UI | Tokens: `--dsw-mask-blur: 0px`, `--dsw-shadow-lv1/lv2/lv3` are zero-blur offsets under a 1px `#000000` outline, `--dsw-elevation-stroke` is 1px, panel/prominent/soft lose their blur, `--dsw-linear-gradient-think` and `-think-select` are flat, `--ds-transition-duration`, `-fast` and `-slow` are `0s`. |
| `--dsw-static-*` ramps | The win2k system palette, light to dark | Tokens: every step of the neutral (`#ffffff`/`#d4d0c8`/`#c0c0c0`/`#808080`/`#404040`/`#000000`), bluish-neutral, blue (`#3a6ea5`/`#0a246a`/`#000080`), deepseek, green, amber and red ramps is set in one grouped block per ramp — all 73 steps the base sheet defines. |

Every `--dsw-alias-*`, `--dsw-static-*` and `--dsw-specific-*` name the sheet sets was checked against the base sheet; the only two defined aliases it leaves to the base theme are `--dsw-alias-bg-document-preview` and `--dsw-alias-label-document-preview`, which the document-preview pane reads.


## Deliberately not included

- **The win2k cursors.** The reference set is twelve SVG data-URL pointers (`%SystemRoot%\cursors`, hotspots included) — a screenful of string noise for a pointer most users never notice.
- **The taskbar, Start menu and common dialogs.** This page has no such markup. The title bar does: the Session header is one.
- **A bitmap `MS Sans Serif`.** The font is a per-machine 1990s bitmap face; the stack names it, then `Microsoft Sans Serif`, Tahoma and `DejaVu Sans` (spelled out so a Linux client lands on a deterministic face rather than whatever `sans-serif` resolves to). A client without any of them gets its own body font and keeps the rest of the skin.
- **Period metrics.** 16px touch targets and 23px push buttons would fight the client's own minimums and keyboard affordances.
- **A page-wide focus-ring restyle.** The client's own ring stays everywhere except the session tree, which takes the Explorer item's 1px dotted inset outline; a dotted rect is too faint to be the only keyboard affordance across the whole app.
- **The menu popup's 2px inner padding.** Adding it would change a component's padding, and the bevels are kept free of padding changes so nothing shifts layout; the items' own inset padding stands.
- **A Plugins-tab card.** The cube is the switch; a second control in Plugin configuration would be a duplicate with its own state.

## Development

```sh
npm run build      # tsc -p tsconfig.build.json → lib/index.js + lib/types/
npm test           # node --test tests/*.test.ts — 7 behavioural tests
npm run typecheck  # tsc -p tsconfig.json
```

`lib/client.js` is hand-authored and the build does not touch it. It is plain JavaScript on purpose: the client module system serves a package's `exports["./client"]` artifact as a lazy-CJS factory registered on `window.__ModuleLoader__`, so an out-of-tree plugin can author it directly instead of reproducing the repository's client preset.

The tests evaluate the shipped bundle the way the client module system loads it, and cover the token layer, the sheet scope, flag-driven retraction on unload, row ordering, and the host settings namespace. None of them prove the *look* — that needs a browser. The mapping table above was checked in one: headless Chromium against the running `dsh web`, toggling the cube, enumerating `button` / `[role]` elements with `getComputedStyle`, and reading the served bundle back from the `/plugins/??…` response. The client half is re-read from the package on each request, so after `npm run build` (or a plain copy of `lib/client.js` into `~/.dsh/profiles/<profile>/node_modules/dsh-win2k/`) a page refresh shows the change; only the host half and the bundle's own patch layer wait for a `dsh web` restart.

## Licence

MIT.
