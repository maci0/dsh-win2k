# dsh-win2k

A working agent UI wearing 2000-era chrome.

Grey face panels, a white document well, navy selection, hard-square corners, MS Sans Serif — repainted live inside the Web client. No fork, no core patch: a token layer plus one stylesheet.

## What you get

- **The palette.** The Windows 2000 registry colour set (`HKCU\Control Panel\Colors`: ButtonFace `#d4d0c8`, ActiveTitle `#0a246a`, Window `#ffffff`, GrayText `#808080`, ButtonDkShadow `#404040`, InfoWindow `#ffffe1`) mapped onto the `--dsw-alias-*` tokens, taken from the win2k sheets this author's other projects ship (`clanker/themes/win2k.json`). Every `--dsw-static-*` step of every ramp is set to the same system palette, so no component falls through to the modern set. Code blocks get a white client area with a grey banner; tooltips get the InfoWindow `#ffffe1` well.
- **The chrome tokens cannot spell.** Square corners, `MS Sans Serif` body text with Lucida Console code, navy `::selection`, a black-framed 1px hard shadow where the base sheet blurs, and the 16px beveled dithered scrollbar. Firefox takes the standard `scrollbar-color` path instead of the WebKit dither. The 2px 3D edges and the sunken wells are `box-shadow` insets, so no bevel changes padding or border-width.
- **No radius at all.** `--dsw-corner-shape: square` only reshapes a rounded corner into a bevel — it does not remove it. The sheet therefore sets `border-radius: 0` on the page and everything under it, so cards, code blocks, chips, tags, dialogs and popups are true rectangles.
- **Faces where the DOM has one.** The 3D edge is spent on the things Windows 2000 actually raised — push buttons, combo boxes, menus, dialogs, InfoTips, the tab control — and the title bar takes ActiveTitle navy. Rails, headers, the Explorer tree, the tab strip and the chat's tool rows stay flat, because a wall of raised plates is not the look. See the mapping table below for which element gets which.
- **The real assets, ripped from the media.** The shell icons and the UI fonts are Microsoft's own, taken out of a Windows 2000 SP4 ISO: `SHELL32.DL_` (folders 4/5, document 2, app window 3, padlock 48, find 23, edit 139, clipboard 152, MS-DOS 40, workstation 16, monitor 179, floppy 30), `COMCTL32.DL_` (the message-box error/info/warning trio), `MICROSS.TT_` + `TAHOMA.TT_`/`TAHOMABD.TT_` + `LUCON.TT_` for Microsoft Sans Serif, Tahoma and Lucida Console, subset to Latin-1 and embedded as woff2 data URIs. Nothing here is a lookalike any more.
- **What is left hand-drawn.** A token cannot repaint an inline `currentColor` glyph, so for the few marks Windows 2000 has no resource for — the + / − tree boxes, the dropdown triangles, the checkbox tick, the switch, the package on a plugin card, the send envelope, the lightbulb on a Think row — the sheet hides the glyph's children and paints a bitmap of its own. The rest:
 yellow folders (closed and open), the tree's + / − expander boxes, a document on a Session row with no status dot, the rail's applet and new-document icons, the Workspaces header's magnifier / list / folder-plus, the settings gear, the permission chip's padlock, the caption's folder, panel and app-picker triangle, the composer's attach box, the send envelope, a black triangle on every dropdown, one leading icon per tool-row variant (Read, Write/Edit, Bash, Search, Code, Think, Others, plus a document fallback for any variant the table does not name), the disclosure caret on every open row, card and section header, an inline file mention, the pane strip's maximize and new tab, the diff tile, the Settings rail's five applets and the Appearance cubes as period monitors, the dialog's bold close X and stepper arrows, the Plugins page's package boxes and search field, the hero's workspace folder and the to-do card's clipboard. The hooks are the DOM's own — `aria-expanded`, `data-variant`, `data-slot`, `data-sidebar-right-expand`, and the empty leading slot a Session row leaves behind — plus the client's readable class local names (`[class*="newSession"]`) where nothing else names the control.
- **A status bar, not a toolbar.** The metric row under the composer drops its glyphs and its raised plates for flat text panes, ButtonFace grey and a 1px sunken separator — the win2k status bar those numbers were always imitating.
- **Period metrics, not just colours.** A 20px caption bar carrying the ActiveTitle → GradientActiveTitle horizontal gradient with white ink, 12px bold Tahoma in it, grey 16x14 control plates on it; 22px tree rows with a 16px glyph slot and a 4px gap (the client ships 34px rows and 6px gaps); 12px tree labels; 18px menu rows with a 16px gutter; status panes padded 6px; a 16px scrollbar with real arrow buttons at each end; square corners everywhere.
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

Visible on click: panels and sidebar go `#d4d0c8` grey, the transcript column goes white, links go navy, every corner squares off, body text turns MS Sans Serif, and scrollbars grow to 16px with a dithered track and a raised thumb. The Session header becomes a navy title bar with white ink; push buttons wear the 2px raised edge and sink when pressed; inputs, composer and code sit in sunken white wells; the session tree selects in navy and wears win2k folders, + / − expanders and document rows; the Settings rail selects in navy and its gear, like the permission chip's padlock, is a period bitmap; menus, dialogs, the tab control, InfoTips and separators take their period shapes; toolbar, tree and tool-row buttons stay flat until the pointer is on them.

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

The row registers into `settings.general.item` at **order 11.5** — ui-theme owns 10 (Appearance) and 11 (Font size), ui-chat owns 12 (Conversation display), and 12 ties with that last row, which put the cube after it on some loads and before it on others. The fractional value is the only slot that keeps it directly under Appearance on every load; two cold loads now render byte-identical dialogs. Injecting into the slot waits for its owner, so load order does not matter. A deployment whose settings service does not serve this namespace renders no row at all.

## Windows 2000 mapping

Windows 2000 is defined by its 2px 3D edges, sunken wells, square corners, hard (unblurred) shadows, navy selection and instant transitions. CSS-module class names are hashed, so the sheet reaches the client through tokens, role/attribute selectors and element selectors only. Every bevel is a `box-shadow` inset pair held in the sheet's own `--dw-raised` / `--dw-sunken`, so no rule changes padding, font, size or border-width.

The split between a raised plate and a flat row is the whole look, and it was checked against the DOM the client really renders in this build — counts below are `document.querySelectorAll` matches in the live Web client with the skin on (a blank Session, a running Session, and the Settings dialog).

| DSH surface (selector) | Windows 2000 counterpart | How it is done |
|---|---|---|
| Push buttons (`button`, `[role="button"]`, `kbd`) — 60 buttons rendered, every one a real action | ButtonFace `#d4d0c8` with the 2px raised edge and square corners | Rule: face background plus `box-shadow: var(--dw-raised)`. |
| Flat chrome: `nav`, `header`, `[role="tree"]`, `[role="treeitem"]`, `[role="toolbar"]`, `[role="tablist"]`, `[role="menu"]`, `[role="listbox"]`, `[data-dockkit-strip]` descendants, and the chat's tool rows (`button[data-turn-process]`, one per Think/Read/Edit/Bash line) | A win2k toolbar, rail and list draw no face at rest; only pressable things are raised | Rule: transparent, no shadow, with `:where()` keeping the specificity equal to the plate rule so a component's own hover/selected rule still wins. Toolbar buttons inside `header` / `[role="toolbar"]` / tab strips get the raised edge back on `:hover`. |
| Session title bar (`header:has([data-conversation-header-leading]):has(nav) > :first-child`, plus its descendants) | The ActiveTitle `#0a246a` caption bar with white ink | Rule: navy background and white foreground, guarded by `nav` (the breadcrumb cluster) so the blank hero state, which renders no title, keeps its caption-free header. `:has()` is already used 49 times in the client's own CSS, so it needs no fallback. |
| Current rail row (`nav button[aria-current]`) | Highlight `#0a246a` selection with white ink | Rule: navy plate, white foreground, beating the component's own pale-blue `.active` class. Token: `--dsw-specific-sidebar-nav-item-active` is navy. |
| Inputs, composer, code blocks (`input` except checkbox/radio/range/file, `textarea`, `select`, `pre`, `:not(pre) > code`) | Sunken white field (one `textarea` in the blank Session, plus `select` in Settings) | Rule: white background plus `box-shadow: var(--dw-sunken)`; `--dsw-alias-bg-base`, `--dsw-specific-input-major`, `--dsw-alias-markdown-code-block` are white. |
| Buttons pressed, toggles on (`button:active`, `[role="button"]:active`, `[aria-pressed="true"]`) | Sunken, content nudged 1px | Rule: `var(--dw-sunken)` plus `transform: translate(1px,1px)` (no layout shift). |
| Explorer tree (`[role="treeitem"]` — 44 in the client, 22 rendered at once) | Win2k tree view | Rule: square and transparent at rest, hover `#e4e1dc`, `[aria-selected="true"]` navy `#0a246a` with white ink on the row and everything in it, `:focus-visible` 1px dotted black inset outline. Tokens: `--dsw-specific-sidebar-*`. |
| Tree icons, scoped to `[data-slot="sidebar.workspaces"]`: workspace folder `[role="treeitem"][aria-expanded] span > svg[width="16"]`, expander `[role="treeitem"] span > svg[width="14"]`, idle Session `[role="treeitem"]:not([aria-expanded]):has(> span:nth-child(3)) > span:first-child:empty::before` | Closed folder, open folder, the + / − expander box, a document | Rule: hide the glyph's children, paint a 16px crispEdges bitmap. `aria-expanded` picks closed vs open and + vs −; the row's own hover swap (folder ↔ chevron) is overridden so both show, ordered + / − first, the way Explorer drew them. A row with a status dot keeps the dot: only an empty leading slot gets the document. |
| Settings gear (`[data-slot="settings.trigger"] svg`) and permission chip (`[data-slot="conversation.input.permission"] svg[width="16"]`) | Gear and padlock | Rule: the same hide-and-paint bitmap treatment; `data-slot` is the language-neutral hook the slot system already puts in the DOM. |
| Composer and hero dropdowns (`[data-slot="conversation.input.permission"]`, `…input.model`, `…hero.agentPreset` — their `svg[width="14"]`), plus every caption chip (`header … button[aria-expanded] svg[width="14"]`) and the caption app picker (`header … [class*="_chevron"] svg`) | A combo box's black triangle | Rule: replace the hairline chevron with a black triangle, so a win2k combo reads as one. A menu cell's submenu caret (`[role="menuitem"] > svg:last-child`) gets the right-pointing triangle; only the last child matches, so a leading item icon is never painted over. |
| Tool rows (`[data-variant="read|write|edit|bash|search|code|think|others"] [class*="iconIdle"] svg` — `ToolRow` puts `data-variant` on its root and the icon in `DisclosureRow`'s `iconIdle` span) | The period leading glyph of each row: document, page-and-pencil, MS-DOS screen, magnifier, code page, lightbulb, gear | Rule: hide the glyph and paint a 14px bitmap. `data-variant` is what makes Read, Edit and Bash distinguishable at all; the variant names come from `ToolRow`'s own model. |
| Rail applet (`[data-slot="sidebar"] nav button svg`), New Session (`[class*="newSession"] svg`), attach (`[class*="_tools"] > button[class*="add"] svg`), Workspaces header (`[class*="_searchButton"] svg`, `[class*="_headerActions"] > span button svg`, `[class*="_headerActions"] > button svg`), caption (`button[data-sidebar-right-expand] svg`, `header … svg[width="15"]`), send (`[data-slot="conversation.composer.bar"] button[class*="primary"] svg`) | App window, new-document page, plus box, magnifier, list view, folder-plus, panel, folder, envelope | Rule: hide-and-paint. The class local names after the hash are the client's own (`_9vZNLq_arrow`, `d3_WYa_searchSlot`), so a substring selector survives the hash changing; each was read off the live DOM, not guessed. |
| Disclosure carets (`[class*="chevron"] svg`, `[class*="_leading"] > svg[width="14"]`, `[class*="card"] [class*="toggle"] svg`) | A solid black triangle, the way win2k folded a section | Rule: only `background-image` is set, so a caret that a more specific rule already sized keeps that size — the caption app picker stays 11px. |
| Inline file mentions, the diff tile, the pane strip button | Document, document, maximize (two overlapping windows) | Rule: hide-and-paint off `[class*="fileLink"]`, `[class*="_tile"]` and `[class*="stripChrome"]`. |
| Settings rail (`[role="dialog"] [class*="navList"] > button:nth-child(1..5) svg`) | Gear, computer, app window, user, file cabinet — a Control Panel list | Rule: hide-and-paint, one bitmap per row in registration order (General, Models, Built-in plugins, Agent presets, Archived sessions). |
| Appearance cubes (`[class*="cubeRow"] > button:nth-child(1..3) svg`), close (`[role="dialog"] [class*="close"] svg`), stepper (`[class*="arrows"] > button svg`), selects (`[role="dialog"] [class*="selector"] svg[width="14"]`) | Light / Dark / System monitors, a bold X, solid spin arrows, a black caret | Rule: hide-and-paint; the cube's three states are its three child positions. |
| Plugins page (`[class*="cardIcon"] svg`, `label[class*="search"] svg`, `[class*="groupToggle"] svg`, `[class*="switcher"] svg`, `[class*="toolbar"] button[class*="primary"] svg`) | Package box, magnifier, section triangle, list view, plus box | Rule: hide-and-paint. The card icon is the fallback every card shares; a plugin that ships its own mark is not overridden — the sheet paints the svg, and a real logo is usually an `img`. |
| Right-hand pane chrome (`[class*="tabStrip"] button[class*="addTab"] svg`, `button[class*="iconButton"] svg`, `[class*="stripChrome"] button svg`) and the hero chips (`[class*="heroWorkspaceRow"] button svg[width="16"]`, `svg[width="12"]`) | New-document page, panel, maximize, folder, black caret | Rule: hide-and-paint, scoped by width so a chip's leading icon and its caret never collide. |
| Per-message actions (`button[aria-label="Copy"|"Copied"|"复制"|"复制成功"|"Branch into a new conversation"|"在新对话中分支"|"Good response"|"好的回答"|"Bad response"|"有问题的回答"|"Remove rating"|"取消标记"]:has(svg)`) | Two pages (copy), a branch tree, a green up triangle, a red down triangle, a black tick | Rule: these are icon-only buttons that share one class and carry no `data-*`, so the accessible name is the only handle. Both shipped locales are matched; an action in a third locale keeps its own glyph instead of getting the wrong bitmap, and `:has(svg)` keeps a text button from being painted. |
| Metric row under the composer (`[class*="_dock"] button[class*="pill"]`, `… button[class*="trigger"]`) | A win2k status bar: flat text panes on the face, no glyphs, 1px sunken separators | Rule: transparent face, no shadow, icons hidden, `#808080` left border between panes, ButtonFace on the dock itself. |
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

- **The product mark.** The sidebar and hero logos are the DeepSeek fish, and they stay: a theme that redraws a vendor's identity as a period bitmap is not a theme any more. They are already a flat monochrome glyph, which is what a win2k title-bar mark would have been.
- **The win2k cursors.** The reference set is twelve SVG data-URL pointers (`%SystemRoot%\cursors`, hotspots included) — a screenful of string noise for a pointer most users never notice.
- **The taskbar, Start menu and common dialogs.** This page has no such markup. The title bar does: the Session header is one.
- **A bitmap `MS Sans Serif`.** The font is a per-machine 1990s bitmap face; the stack names it, then `Microsoft Sans Serif`, Tahoma and `DejaVu Sans` (spelled out so a Linux client lands on a deterministic face rather than whatever `sans-serif` resolves to). A client without any of them gets its own body font and keeps the rest of the skin.
- **Period metrics.** 16px touch targets and 23px push buttons would fight the client's own minimums and keyboard affordances.
- **A page-wide focus-ring restyle.** The client's own ring stays everywhere except the session tree, which takes the Explorer item's 1px dotted inset outline; a dotted rect is too faint to be the only keyboard affordance across the whole app.
- **The menu popup's 2px inner padding.** Adding it would change a component's padding, and the bevels are kept free of padding changes so nothing shifts layout; the items' own inset padding stands.
- **A Plugins-tab card.** The cube is the switch; a second control in Plugin configuration would be a duplicate with its own state.

## Assets and licensing

The icon bitmaps and the font faces embedded in `lib/client.js` are Microsoft's, extracted from a
Windows 2000 Professional SP4 ISO held by the plugin's author (`SHELL32.DL_`, `COMCTL32.DL_`,
`MORICONS.DL_`, `MICROSS.TT_`, `TAHOMA.TT_`, `TAHOMABD.TT_`, `LUCON.TT_`). They are **not** covered by
this package's MIT licence, and shipping them is the deployer's call; the author states they have
Microsoft's permission for this use. Everything else in the package — the sheet, the hooks, the
hand-drawn marks, the host half — is MIT as the LICENSE says.

The extraction is reproducible with plain `7z`, `cabextract` and a ~120-line PE resource reader
(RT_GROUP_ICON / RT_ICON walk); the fonts are subset with `pyftsubset` and `woff2_compress`.

## Development

```sh
npm run build      # tsc -p tsconfig.build.json → lib/index.js + lib/types/
npm test           # node --test tests/*.test.ts — 7 behavioural tests
npm run typecheck  # tsc -p tsconfig.json
```

One hook style is worth flagging: the client's CSS-module classes are `[hash]_[localName]`, so `[class*="newSession"]` survives the hash changing. It is the only way to reach a control the DOM gives no role, attribute or slot for; it is also the one hook that can break on a rename upstream, so each use is listed in the table above.

`lib/client.js` is hand-authored and the build does not touch it. It is plain JavaScript on purpose: the client module system serves a package's `exports["./client"]` artifact as a lazy-CJS factory registered on `window.__ModuleLoader__`, so an out-of-tree plugin can author it directly instead of reproducing the repository's client preset.

The tests evaluate the shipped bundle the way the client module system loads it, and cover the token layer, the sheet scope, flag-driven retraction on unload, row ordering, and the host settings namespace. None of them prove the *look* — that needs a browser. The mapping table above was checked in one: headless Chromium against the running `dsh web`, toggling the cube, enumerating `button` / `[role]` elements with `getComputedStyle`, reading the served bundle back from the `/plugins/??…` response, and rendering every icon data URI on a bare page at 6x to see what the bitmap actually draws. Two notes on method. The bundled headless Chromium paints no scrollbars at all — a plain red-track/green-thumb test page shows none — so the scrollbar was checked in a *headed* Chromium under `xvfb-run`, which renders the dithered track and the beveled thumb as expected. And the per-message actions were only reachable through their accessible names, which is the one place this sheet would need a new label if the UI is ever translated again. The client half is re-read from the package on each request, so after `npm run build` (or a plain copy of `lib/client.js` into `~/.dsh/profiles/<profile>/node_modules/dsh-win2k/`) a page refresh shows the change; only the host half and the bundle's own patch layer wait for a `dsh web` restart.

## Licence

MIT.
