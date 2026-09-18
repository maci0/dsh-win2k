/**
 * dsh-win2k — browser half.
 *
 * Three surfaces, one flag:
 *
 * - a `ctx.theme.overrideTokens` layer that repaints the Web client in the
 *   Windows 2000 palette;
 * - the cube that sets it, registered into `settings.general.item` directly
 *   under the built-in Appearance cubes and wearing their chrome; and
 * - a chrome sheet that carries the part a token cannot spell.
 *
 * The palette is the Windows 2000 registry colour set (`HKCU\Control
 * Panel\Colors`: ButtonFace #d4d0c8, ActiveTitle #0a246a, Window #ffffff,
 * GrayText #808080, ButtonDkShadow #404040, InfoWindow #ffffe1) mapped onto the
 * `--dsw-alias-*` tokens, taken from the win2k theme the author's other
 * projects ship (clanker `themes/win2k.json`).
 *
 * The palette is a stacked token layer, not a registered theme. The durable
 * `ui-theme` preference schema holds built-in ids only, so a third-party id can
 * never be the persisted preference: registering one and forcing it back on
 * every `theme/change` left the skin at the mercy of the next settings write
 * and lost it on reload. An override layer sits above whatever built-in the
 * user picked and is owned by this plugin's own `selected` flag, so the choice
 * persists without racing the Appearance row — Light/Dark/System keep working
 * underneath and the win2k colours stay on top while the cube is on.
 *
 * Chrome is a stylesheet, not inline style objects: the module system claims
 * every `<style>` tag a factory appends while it materializes and removes it
 * when the package unloads, so the tag costs nothing to own. Every chrome rule
 * is scoped under `body[data-dsw-win2k]`, the attribute this half toggles from
 * the flag, so the sheet is inert while the skin is off. It is appended after
 * ui-theme's sheets (this package injects `dsh-client-ui-theme`), which is what
 * lets an unbumped `::-webkit-scrollbar-thumb` rule win.
 *
 * This file is plain JavaScript on purpose. The client module system serves a
 * package's `exports["./client"]` artifact as a lazy-CJS factory registered on
 * `window.__ModuleLoader__`, and that is the whole format — an out-of-tree
 * plugin can author it directly instead of reproducing the repository's tsdown
 * client preset.
 *
 * Deliberately not carried over from the reference sheets: the win2k cursors
 * (`%SystemRoot%\cursors` as SVG data URLs — twelve rules of string noise for a
 * pointer most users never notice), the title-bar gradient (win2k's own bar is
 * flat ActiveTitle navy; the Session header takes it), the taskbar and Start
 * menu (markup this page does not have), per-component metrics, and a page-wide
 * focus-ring restyle (a 1px dotted rect is period-correct and too faint to be
 * the only keyboard affordance here). Corners go square through
 * `--dsw-corner-shape`, which also squares the capsules and circles the base
 * sheet rounds; that is the period look, and it is one line instead of a
 * class-by-class override list.
 */

window.__ModuleLoader__.load({
  id: 'dsh-win2k',

  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    /** Settings namespace shared with the host half. */
    const NAMESPACE = 'win2k'

    /** Locale namespace for this plugin's copy. */
    const LOCALE_NS = 'win2k'

    /**
     * Override-layer source, and the id the layer is stacked under. Not a
     * registered theme: the durable preference schema holds built-in ids only,
     * so a registered third-party id can never persist, and every settings
     * write or reload would drag the active theme back to light/dark/system.
     */
    const THEME_ID = 'win2k'

    /**
     * Alias-layer overrides: Windows 2000 registry colours on the semantic
     * tokens. Only aliases are listed — every component reads those, and the
     * `--dsw-static-*` steps underneath stay untouched so an unmapped token
     * still resolves to a sane value.
     */
    const TOKENS = {
      /* Surfaces: the white document well inside a grey face frame. */
      '--dsw-alias-bg-base': '#ffffff',
      '--dsw-alias-bg-layer-1': '#ffffff',
      '--dsw-alias-bg-layer-2': '#d4d0c8',
      '--dsw-alias-bg-layer-3': '#d4d0c8',
      '--dsw-alias-bg-overlay': '#d4d0c8',
      '--dsw-alias-bg-module-platform': '#d4d0c8',
      '--dsw-alias-bg-multi-select': '#d4d0c8',
      '--dsw-alias-bg-skeleton': 'rgba(64, 64, 64, 0.08)',
      /* Masks dim the page behind a lightbox or a drop target. Win2k had no
         blur, so they stay flat black (or white for the drop mask). */
      '--dsw-alias-bg-mask-1': 'rgba(0, 0, 0, 0.32)',
      '--dsw-alias-bg-mask-2': 'rgba(0, 0, 0, 0.16)',
      '--dsw-alias-bg-mask-3': 'rgba(0, 0, 0, 0.48)',
      '--dsw-alias-bg-mask-drop': 'rgba(255, 255, 255, 0.7)',
      '--dsw-alias-bg-mask-photo': 'rgba(0, 0, 0, 0.88)',

      /* Edges: ButtonShadow #808080 outside ButtonDkShadow #404040. */
      '--dsw-alias-border-l1': '#808080',
      '--dsw-alias-border-l2': '#808080',
      '--dsw-alias-border-l3': '#404040',
      '--dsw-alias-border-l4': '#404040',
      /* Inverted edges sit on the navy title bar, so they are the hilight and
         the face, not a darkened neutral. */
      '--dsw-alias-border-inverted': '#ffffff',
      '--dsw-alias-border-inverted2': '#c0c0c0',
      /* The hairline a raised surface draws around itself: ButtonShadow. */
      '--dsw-alias-border-l2-darkmode-thin': '#808080',

      /* Ink: WindowText #000, GrayText #808080, 3DLight #b5b5b5. */
      '--dsw-alias-label-primary': '#000000',
      '--dsw-alias-label-secondary': '#000000',
      '--dsw-alias-label-tertiary': '#404040',
      '--dsw-alias-label-caption': '#808080',
      '--dsw-alias-label-dimmed': '#b5b5b5',
      '--dsw-alias-label-primary-dimmed': '#000000',
      '--dsw-alias-label-primary-bluish': '#0a246a',
      /* Kept white: it is the ink on a `label-primary` fill, not a surface. */
      '--dsw-alias-label-primary-inverted': '#ffffff',
      '--dsw-alias-label-primary-foreground': '#ffffff',

      /* Accent: ActiveTitle #0a246a, the one saturated colour win2k had. */
      '--dsw-alias-brand-primary': '#0a246a',
      '--dsw-alias-brand-primary-invert': '#d4d0c8',
      '--dsw-alias-brand-primary-new-colorprimary-new-color': '#0a246a',
      '--dsw-alias-brand-text': '#000000',
      '--dsw-alias-button-contrast-fill': '#0a246a',
      '--dsw-alias-button-primary-fill': '#0a246a',
      '--dsw-alias-button-primary-hover': '#1c3f8f',
      '--dsw-alias-button-primary-dimmed': '#b5b5b5',
      '--dsw-alias-button-elevated-fill': '#d4d0c8',
      '--dsw-alias-button-floating-fill': '#d4d0c8',
      '--dsw-alias-button-floating-hover': '#e4e1dc',
      '--dsw-alias-button-ghost-active-border': '#404040',
      '--dsw-alias-button-ghost-active-fill': '#d4d0c8',
      '--dsw-alias-button-ghost-active-hover': '#e4e1dc',
      /* Toolbar buttons are face plates that lighten on hover; the invisible
         variant is the same plate with no face until it is hovered. */
      '--dsw-alias-button-tool-bar-fill': '#d4d0c8',
      '--dsw-alias-button-tool-bar-fill-invisible': 'rgba(212, 208, 200, 0)',
      '--dsw-alias-button-tool-bar-hover': '#e4e1dc',
      /* HiLight #000080, the period's link and hot-tracking colour. */
      '--dsw-alias-button-info-fill': '#000080',
      '--dsw-alias-button-info-hover': '#333399',
      '--dsw-alias-link': '#000080',

      /* Interaction: a selection-coloured wash, never a glow. */
      '--dsw-alias-interactive-bg-hover': 'rgba(10, 36, 106, 0.08)',
      '--dsw-alias-interactive-bg-active': 'rgba(10, 36, 106, 0.16)',
      '--dsw-alias-interactive-bg-hover-accent': 'rgba(10, 36, 106, 0.16)',
      '--dsw-alias-interactive-bg-hover-danger': 'rgba(164, 0, 0, 0.08)',
      '--dsw-alias-interactive-bg-hover-solid': '#ffffff',

      /* Code: a white client area with a grey caption, like a source window. */
      '--dsw-alias-markdown-code-block': '#ffffff',
      '--dsw-alias-markdown-code-block-banner': '#d4d0c8',
      '--dsw-alias-markdown-code-segment-selected': '#ffffff',
      '--dsw-alias-markdown-code-segment-unselected': '#d4d0c8',
      '--dsw-alias-markdown-inline-code': '#ffffff',
      '--dsw-alias-markdown-placeholder': '#d4d0c8',
      '--dsw-alias-markdown-tag': '#d4d0c8',
      '--dsw-alias-markdown-citation': '#d4d0c8',

      /* State: the registry's own success/danger/warning inks. */
      '--dsw-alias-state-business-primary': '#0a246a',
      '--dsw-alias-state-business-tertiary': '#a6caf0',
      '--dsw-alias-state-error-primary': '#a40000',
      '--dsw-alias-state-error-secondary': '#c00000',
      '--dsw-alias-state-success-primary': '#006400',
      '--dsw-alias-state-success-secondary': '#008000',
      '--dsw-alias-state-success-tertiary': '#e2efe2',
      '--dsw-alias-state-warn-primary': '#8a6d00',
      '--dsw-alias-state-warn-secondary': '#a08000',
      '--dsw-alias-state-warn-label': '#6b5200',
      '--dsw-alias-state-warn-tertiary': '#ffffe1',

      /* Tooltip and toast ink is white in the base sheets, so both stay dark. */
      '--dsw-alias-tooltip-bg': '#0a246a',
      '--dsw-alias-toast-bg': '#0a246a',

      /* Chat and shell surfaces. */
      '--dsw-specific-bubble': '#ffffff',
      '--dsw-specific-bubble-highlight': '#a6caf0',
      '--dsw-specific-input-major': '#ffffff',
      '--dsw-specific-login-input': '#ffffff',
      '--dsw-specific-menu': '#d4d0c8',
      '--dsw-specific-selector': '#d4d0c8',
      '--dsw-specific-sidebar-fill': '#d4d0c8',
      /* The settings rail's current row is a Windows selection, so it is the
         registry's Highlight navy, and the chrome sheet flips its ink white. */
      '--dsw-specific-sidebar-nav-item-active': '#0a246a',
      '--dsw-specific-sidebar-nav-item-active-accent': '#a6caf0',
      '--dsw-specific-sidebar-nav-item-hover': '#c9c5bd',
      '--dsw-specific-tip': '#ffffe1',

      /* Scrollbar aliases: raised ButtonFace thumb, lighter on hover. The
         chrome sheet's dithered track is the same pair in raw values. */
      '--dsw-alias-scrollbar-bg-l1': '#d4d0c8',
      '--dsw-alias-scrollbar-bg-l2': '#d4d0c8',
      '--dsw-alias-scrollbar-hover-l1': '#c0bdb6',
      '--dsw-alias-scrollbar-hover-l2': '#c0bdb6',

      /* Static ramps: the win2k system palette, light to dark. Every step of
         every ramp carries a value so no component falls through to the
         modern set. */

      /* Neutral ramp: Window #ffffff, ButtonFace #d4d0c8, ButtonShadow
         #c0c0c0/#808080, ButtonDkShadow #404040, black. */
      '--dsw-static-neutral-00': '#ffffff',
      '--dsw-static-neutral-50': '#ffffff',
      '--dsw-static-neutral-100': '#d4d0c8',
      '--dsw-static-neutral-150': '#d4d0c8',
      '--dsw-static-neutral-200': '#c0c0c0',
      '--dsw-static-neutral-250': '#c0c0c0',
      '--dsw-static-neutral-300': '#c0c0c0',
      '--dsw-static-neutral-400': '#808080',
      '--dsw-static-neutral-500': '#808080',
      '--dsw-static-neutral-550': '#808080',
      '--dsw-static-neutral-600': '#404040',
      '--dsw-static-neutral-700': '#404040',
      '--dsw-static-neutral-800': '#404040',
      '--dsw-static-neutral-850': '#404040',
      '--dsw-static-neutral-900': '#000000',
      '--dsw-static-neutral-1000': '#000000',

      /* Bluish-neutral ramp: white, ButtonFace, GrayText, ActiveTitle. */
      '--dsw-static-neutral-bluish-00': '#ffffff',
      '--dsw-static-neutral-bluish-50': '#ffffff',
      '--dsw-static-neutral-bluish-60': '#d4d0c8',
      '--dsw-static-neutral-bluish-75': '#d4d0c8',
      '--dsw-static-neutral-bluish-100': '#d4d0c8',
      '--dsw-static-neutral-bluish-150': '#d4d0c8',
      '--dsw-static-neutral-bluish-200': '#d4d0c8',
      '--dsw-static-neutral-bluish-300': '#808080',
      '--dsw-static-neutral-bluish-400': '#808080',
      '--dsw-static-neutral-bluish-500': '#808080',
      '--dsw-static-neutral-bluish-600': '#808080',
      '--dsw-static-neutral-bluish-700': '#0a246a',
      '--dsw-static-neutral-bluish-750': '#0a246a',
      '--dsw-static-neutral-bluish-800': '#0a246a',
      '--dsw-static-neutral-bluish-850': '#0a246a',
      '--dsw-static-neutral-bluish-875': '#0a246a',
      '--dsw-static-neutral-bluish-900': '#0a246a',
      '--dsw-static-neutral-bluish-950': '#0a246a',
      '--dsw-static-neutral-bluish-1000': '#0a246a',

      /* Blue ramp: white, ButtonFace, the win2k 3D-blue #3a6ea5, ActiveTitle
         #0a246a, then the period's link navy #000080. */
      '--dsw-static-blue-50': '#ffffff',
      '--dsw-static-blue-50p': '#d4d0c8',
      '--dsw-static-blue-75': '#d4d0c8',
      '--dsw-static-blue-100': '#d4d0c8',
      '--dsw-static-blue-300': '#3a6ea5',
      '--dsw-static-blue-400': '#3a6ea5',
      '--dsw-static-blue-450': '#3a6ea5',
      '--dsw-static-blue-500': '#0a246a',
      '--dsw-static-blue-600': '#0a246a',
      '--dsw-static-blue-800': '#000080',
      '--dsw-static-blue-900': '#000080',
      '--dsw-static-blue-950': '#000080',

      /* Deepseek ramp: the same blue ramp, one step coarser. */
      '--dsw-static-deepseek-50': '#ffffff',
      '--dsw-static-deepseek-100': '#d4d0c8',
      '--dsw-static-deepseek-200': '#d4d0c8',
      '--dsw-static-deepseek-300': '#d4d0c8',
      '--dsw-static-deepseek-400': '#3a6ea5',
      '--dsw-static-deepseek-450': '#3a6ea5',
      '--dsw-static-deepseek-500': '#0a246a',
      '--dsw-static-deepseek-600': '#0a246a',
      '--dsw-static-deepseek-700-delete': '#000080',
      '--dsw-static-deepseek-800': '#000080',
      '--dsw-static-deepseek-900': '#000080',

      /* Green ramp: a pale win2k success face, then the registry's green. */
      '--dsw-static-green-100': '#c0d8c0',
      '--dsw-static-green-400': '#008000',
      '--dsw-static-green-500': '#008000',
      '--dsw-static-green-900': '#004000',

      /* Amber ramp: InfoWindow #ffffe1/#ffffcc, then olive. */
      '--dsw-static-amber-100': '#ffffe1',
      '--dsw-static-amber-400': '#ffffcc',
      '--dsw-static-amber-500': '#ffffcc',
      '--dsw-static-amber-600': '#808000',
      '--dsw-static-amber-900': '#404000',

      /* Red ramp: a pale error face, then the registry's red. */
      '--dsw-static-red-50': '#ffd4d4',
      '--dsw-static-red-100': '#ffd4d4',
      '--dsw-static-red-400': '#ff0000',
      '--dsw-static-red-500': '#ff0000',
      '--dsw-static-red-600': '#800000',
      '--dsw-static-red-900': '#800000',

      /* 1999's faces. Body text was 11px MS Sans Serif; the type scale keeps
         the client's own sizes and only takes the family. */
      '--dsw-font-family': '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, "DejaVu Sans", Verdana, sans-serif',
      '--ds-font-family-code': '"Lucida Console", "Courier New", monospace',
    }

    /** Every class is `dw-`-prefixed: the sheet lands in the page's own document. */
    /* Bevels are box-shadow insets, never borders: `--dw-raised` / `--dw-sunken`
       are the 2px win2k edge, and no rule here touches padding, font, size or
       border-width, so nothing shifts layout. */
    /* Structural knobs the components read but the palette never set: flat
       masks and think gradients, unblurred lv1/lv2/lv3 shadows, a 1px
       elevation stroke, and instant transitions. */
    /* Selection is the period's navy wash; the scrollbar keeps the dithered
       track and a raised thumb, now fed from the alias pair as well. */
    /* Firefox takes the standard scrollbar path (the two are mutually
       exclusive in the base sheet): a grey thumb on a white track. */
    /* Faces, drawn where the client's DOM really has one. A win2k window is a
       grey face with white wells, and it keeps its 3D edges for the things that
       are pressed: push buttons, combo boxes, menus, dialogs, tooltips, the tab
       control and the title bar. Everything that is a row or a rail — `nav`,
       `header`, the Explorer tree, the tab strip, menus, and the tool rows the
       chat renders as `data-turn-process` buttons — stays flat, because a wall
       of raised plates is not the look. */
    /* The cube row. Geometry and tokens are the Appearance row's own, so the
       two read as one control group; only the width is fixed, because a
       single cube stretched across the panel would not look like a cube. */
    /* One template literal with the indentation stripped: the emitted sheet
       stays a single line, and the existing test asserts it is appended once. */
    const CSS = `
body[data-dsw-win2k]{--dsw-corner-shape:square}
body[data-dsw-win2k]{--dw-raised:inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #d4d0c8;--dw-sunken:inset 1px 1px #0a0a0a, inset -1px -1px #ffffff, inset 2px 2px #808080, inset -2px -2px #d4d0c8;--dsh-scrollbar-width:16px;--dsh-scrollbar-thumb:#d4d0c8;--dsh-scrollbar-thumb-hover:#c0bdb6;--dsh-scrollbar-thumb-border:0px;--dsh-scrollbar-track-margin:0px;--dsw-mask-blur:0px;--dsw-linear-gradient-think:linear-gradient(180deg,#ffffff 0,#ffffff 100%);--dsw-linear-think-select:linear-gradient(180deg,#d4d0c8 0,#d4d0c8 100%)}
body[data-dsw-win2k] ::selection{background:#0a246a;color:#ffffff}
body[data-dsw-win2k],body[data-dsw-win2k] *{--dsw-elevation-stroke:0 0 0 1px var(--dsw-elevation-stroke-color);--dsw-elevation-stroke-color:#404040;--dsw-elevation-panel:0 0 0 1px #404040,2px 2px 0 rgba(0,0,0,.35);--dsw-elevation-prominent:0 0 0 1px #404040,2px 2px 0 rgba(0,0,0,.4);--dsw-elevation-soft:0 0 0 1px #808080,2px 2px 0 rgba(0,0,0,.3);--dsw-shadow-lv1:0 0 0 1px #000000,1px 1px 0 rgba(0,0,0,.25);--dsw-shadow-lv2:0 0 0 1px #000000,2px 2px 0 rgba(0,0,0,.3);--dsw-shadow-lv3:0 0 0 1px #000000,2px 2px 0 rgba(0,0,0,.35);--ds-transition-duration:0s;--ds-transition-duration-fast:0s;--ds-transition-duration-slow:0s}
body[data-dsw-win2k] ::-webkit-scrollbar-track{background:repeating-conic-gradient(#ffffff 0% 25%,#d4d0c8 0% 50%) 0 0/2px 2px;box-shadow:inset 1px 1px 0 #404040,inset -1px -1px 0 #ffffff}
body[data-dsw-win2k] ::-webkit-scrollbar-thumb{border-radius:0;background:#d4d0c8;background-clip:border-box;box-shadow:inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #d4d0c8}
body[data-dsw-win2k] ::-webkit-scrollbar-thumb:hover{background-color:#c0bdb6}
body[data-dsw-win2k] ::-webkit-scrollbar-corner{background:#d4d0c8}
@supports not selector(::-webkit-scrollbar){body[data-dsw-win2k],body[data-dsw-win2k] *{scrollbar-width:auto;scrollbar-color:#d4d0c8 #ffffff}}
body[data-dsw-win2k] button,body[data-dsw-win2k] [role="button"],body[data-dsw-win2k] kbd{background-color:#d4d0c8;box-shadow:var(--dw-raised);border-radius:0}
/* Flat chrome. A win2k toolbar, tree, tab strip and rail draw no face at rest:
   only a push button keeps the 2px 3D edge. The :where() wrapper holds these
   selectors at the plate rule's own specificity, so a component's hover and
   selected rules still win, and this rule sits after the plate so it wins at
   rest. */
body[data-dsw-win2k] :where(nav,header,[role="tree"],[role="treeitem"],[role="toolbar"],[role="tablist"],[role="menu"],[role="listbox"],[data-dockkit-strip]) button{background-color:transparent;box-shadow:none}
body[data-dsw-win2k] button[data-turn-process]{background-color:transparent;box-shadow:none}
/* Toolbar buttons react like win2k's: flat until the pointer is on them. */
body[data-dsw-win2k] :where(header,[role="toolbar"],[data-dockkit-strip]) button:hover{background-color:#d4d0c8;box-shadow:var(--dw-raised)}
/* The rail's current row is the registry Highlight: navy plate, white ink. */
body[data-dsw-win2k] :where(nav,header) button[aria-current]:not([aria-current="false"]){background-color:#0a246a;color:#ffffff}
body[data-dsw-win2k] button:active,body[data-dsw-win2k] [role="button"]:active,body[data-dsw-win2k] [aria-pressed="true"]{box-shadow:var(--dw-sunken);transform:translate(1px,1px)}
body[data-dsw-win2k] textarea,body[data-dsw-win2k] select,body[data-dsw-win2k] input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="file"]){background-color:#ffffff;box-shadow:var(--dw-sunken)}
body[data-dsw-win2k] select{appearance:none;-webkit-appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Crect width='16' height='16' fill='%23d4d0c8'/%3E%3Cpath d='M0 0h16v1H0zM0 0h1v16H0z' fill='%23ffffff'/%3E%3Cpath d='M0 15h16v1H0zM15 0h1v16h-1z' fill='%230a0a0a'/%3E%3Cpath d='M5 6.5h6L8 10z' fill='%23000000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 1px center;background-size:16px 16px}
body[data-dsw-win2k] input[type="checkbox"]{appearance:none;-webkit-appearance:none;width:13px;height:13px;background-color:#ffffff;box-shadow:var(--dw-sunken);border-radius:0}
body[data-dsw-win2k] input[type="checkbox"]:checked{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 13 13'%3E%3Cpath d='M2.5 6.5l3 3.5 5-7' fill='none' stroke='%23000000'/%3E%3C/svg%3E")}
body[data-dsw-win2k] [role="treeitem"]{background-color:transparent;box-shadow:none;border-radius:0}
body[data-dsw-win2k] [role="treeitem"]:hover{background-color:#e4e1dc}
body[data-dsw-win2k] [role="treeitem"][aria-selected="true"]{background-color:#0a246a;color:#ffffff}
body[data-dsw-win2k] [role="treeitem"][aria-selected="true"] *{color:#ffffff}
body[data-dsw-win2k] [role="treeitem"]:focus-visible{outline:1px dotted #000000;outline-offset:-1px}
body[data-dsw-win2k] [role="menu"]{background-color:#d4d0c8;box-shadow:var(--dw-raised),2px 2px 0 rgba(0,0,0,.35);border-radius:0}
body[data-dsw-win2k] [role="menuitem"],body[data-dsw-win2k] [role="menuitemradio"]{background-color:transparent;box-shadow:none;border-radius:0}
body[data-dsw-win2k] [role="menuitem"]:hover,body[data-dsw-win2k] [role="menuitem"]:focus,body[data-dsw-win2k] [role="menuitemradio"]:hover,body[data-dsw-win2k] [role="menuitemradio"]:focus{background-color:#0a246a;color:#ffffff}
body[data-dsw-win2k] [role="dialog"]{background-color:#d4d0c8;box-shadow:var(--dw-raised),2px 2px 0 rgba(0,0,0,.35);border-radius:0}
body[data-dsw-win2k] [role="tablist"]{background-color:#d4d0c8}
body[data-dsw-win2k] [role="tab"]{background-color:#d4d0c8;box-shadow:inset -1px -1px #404040,inset 1px 1px #ffffff;border-radius:0}
body[data-dsw-win2k] [role="tab"][aria-selected="true"]{background-color:#ffffff;color:#000000;box-shadow:inset 1px 0 #808080,inset -1px 0 #808080}
body[data-dsw-win2k] [role="tab"][aria-selected="true"]::after{background:transparent}
/* The Session header is this page's title bar. Windows 2000 never dropped the
   navy caption, so the title row takes ActiveTitle with white ink — but only
   once the header really carries a title (nav is the breadcrumb cluster, which
   the blank hero state does not render, and a caption with no words is worse
   than no caption). The tab strip below it stays a face control. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]):has(nav) > div:first-child{background-color:#0a246a}
body[data-dsw-win2k] header:has([data-conversation-header-leading]):has(nav) > div:first-child,
body[data-dsw-win2k] header:has([data-conversation-header-leading]):has(nav) > div:first-child *{color:#ffffff}
/* Windows 2000 shell icons. The client draws its glyphs as inline <svg> with
   currentColor paths, which no token can repaint; the chrome sheet hides the
   glyph's own children and paints a period bitmap in their place. The hooks are
   ones the DOM already carries: aria-expanded is on the workspace row and
   splits folders from sessions, and its value holds the expander's + / − state;
   data-slot names the settings gear and the permission chip. Shapes stay on
   the 16px grid with crispEdges, so they read as the 16-colour bitmaps they are
   imitating. */
/* The row swaps folder for expander on hover to save a slot; a win2k tree shows both, with the + / - box first. */
/* An idle Session row leaves its leading slot empty; a win2k file list drew a document there, and a live row keeps its own status dot. */
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"]:not([aria-expanded]):has(> span:nth-child(3)) > span:first-child:empty::before{content:'';display:block;width:16px;height:16px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M3 1h7l3 3v11H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M10 1l3 3h-3z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M5 6h6v1H5z' fill='%23808080'/%3E%3Cpath d='M5 8h6v1H5z' fill='%23808080'/%3E%3Cpath d='M5 10h4v1H5z' fill='%23808080'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] > span:first-child{display:inline-flex;order:-1}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] > span:nth-child(2){display:inline-flex;order:-2}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] span > svg[width="16"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 3h6l2 2h6v9H1z' fill='%23c8952f'/%3E%3Cpath d='M1 6h14v8H1z' fill='%23ffd45e' stroke='%23000000'/%3E%3Cpath d='M2 7h12v1H2z' fill='%23ffe9a8'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded="true"] span > svg[width="16"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 4h6l2 2h6v2H1z' fill='%23c8952f'/%3E%3Cpath d='M6 5h8v4H6z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M1 8h13v6H1z' fill='%23ffd45e' stroke='%23000000'/%3E%3Cpath d='M2 9h11v1H2z' fill='%23ffe9a8'/%3E%3C/svg%3E")}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"] span > svg[width="14"]{transform:none;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 3h8v8H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M6 4h2v6H6z' fill='%23000000'/%3E%3Cpath d='M4 6h6v2H4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded="true"] span > svg[width="14"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 3h8v8H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M4 6h6v2H4z' fill='%23000000'/%3E%3C/svg%3E")}
/* Composer and hero dropdowns: a win2k combo box ends in a black triangle, not a hairline chevron. */
body[data-dsw-win2k] :where([data-slot="conversation.input.permission"],[data-slot="conversation.input.model"],[data-slot="conversation.hero.agentPreset"]) svg[width="14"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] :where([data-slot="conversation.input.permission"],[data-slot="conversation.input.model"],[data-slot="conversation.hero.agentPreset"]) svg[width="14"] *{display:none}
body[data-dsw-win2k] [data-slot="settings.trigger"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cg fill='%23c0c0c0' stroke='%23000000'%3E%3Crect x='7' y='1' width='2' height='3'/%3E%3Crect x='7' y='12' width='2' height='3'/%3E%3Crect x='1' y='7' width='3' height='2'/%3E%3Crect x='12' y='7' width='3' height='2'/%3E%3Crect x='3' y='3' width='3' height='3'/%3E%3Crect x='10' y='3' width='3' height='3'/%3E%3Crect x='3' y='10' width='3' height='3'/%3E%3Crect x='10' y='10' width='3' height='3'/%3E%3Ccircle cx='8' cy='8' r='5'/%3E%3C/g%3E%3Ccircle cx='8' cy='8' r='2' fill='%23ffffff' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] [data-slot="conversation.input.permission"] svg[width="16"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M5 8V6a3 3 0 016 0v2' fill='none' stroke='%23808080' stroke-width='2'/%3E%3Cpath d='M3 8h10v6H3z' fill='%23ffd45e' stroke='%23000000'/%3E%3Cpath d='M7 10h2v3H7z' fill='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] span > svg[width="16"] *,body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"] span > svg[width="14"] *,body[data-dsw-win2k] [data-slot="settings.trigger"] svg *,body[data-dsw-win2k] [data-slot="conversation.input.permission"] svg[width="16"] *{display:none}
body[data-dsw-win2k] [role="tooltip"]{background-color:#ffffe1;color:#000000;box-shadow:0 0 0 1px #000000;border-radius:0}
body[data-dsw-win2k] [role="alert"]{background-color:#d4d0c8;color:#000000;box-shadow:var(--dw-raised),2px 2px 0 rgba(0,0,0,.35);border-radius:0}
body[data-dsw-win2k] [role="switch"]{background-color:#d4d0c8;box-shadow:var(--dw-raised);border-radius:0}
body[data-dsw-win2k] [role="switch"][aria-checked="true"]{background-color:#ffffff;box-shadow:var(--dw-sunken)}
body[data-dsw-win2k] [role="switch"] > span:last-child{border-radius:0;background-color:#ffffff}
body[data-dsw-win2k] [role="switch"][aria-checked="true"] > span:last-child{background-color:#0a246a}
body[data-dsw-win2k] [role="separator"]{background-image:linear-gradient(#808080 0 1px,#ffffff 1px 2px)}
body[data-dsw-win2k] hr{border-color:#808080 #ffffff #ffffff #808080;border-style:solid}
body[data-dsw-win2k] td,body[data-dsw-win2k] th{border-color:#808080}
body[data-dsw-win2k] th{background-color:#d4d0c8;box-shadow:var(--dw-raised)}
body[data-dsw-win2k] pre,body[data-dsw-win2k] :not(pre) > code{background-color:#ffffff;box-shadow:var(--dw-sunken)}
.dw-group{display:flex;flex-direction:column;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.dw-title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dw-cubes{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap}
.dw-cube{box-sizing:border-box;flex:0 1 180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:20px 32px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:20px;background:transparent;font:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);cursor:pointer}
.dw-cube:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dw-cube-selected{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}
.dw-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
`.replace(/\n\s*/g, '')

    // Appended while the factory materializes: the module system claims the tag
    // for this package and disposes it on unload. Guarded because the node unit
    // tests evaluate this file without a DOM.
    if (typeof document !== 'undefined') {
      const style = document.createElement('style')
      style.textContent = CSS
      document.head.append(style)
    }

    /** Body attribute every chrome rule is scoped under. */
    const ACTIVE_ATTRIBUTE = 'data-dsw-win2k'

    /**
     * The same palette in the shape `ctx.theme.overrideTokens` takes: one value
     * per color scheme. Windows 2000 had a single scheme, so both entries repeat
     * the same value — a win2k skin must not go illegible when the user's
     * underlying preference is dark.
     */
    const OVERRIDES = Object.fromEntries(
      Object.entries(TOKENS).map(([name, value]) => [name, { light: value, dark: value }]),
    )

    const en = {
      title: 'Theme',
      label: 'Windows 2000',
      cubeHint: 'Grey face, navy selection, square corners.',
      override: 'The win2k colours are layered over the Appearance choice above; switch this off to return to it.',
      readOnly: 'Read-only: settings are not persisted in this deployment.',
    }

    const zh = {
      title: '主题',
      label: 'Windows 2000',
      cubeHint: '灰色面板、深蓝选中、直角边框。',
      override: '「Windows 2000」配色叠加在上方「外观」选项之上；关闭后即可恢复。',
      readOnly: '只读：此部署不会持久化设置。',
    }

    /**
     * Read a snapshot's `selected` flag.
     * @param snapshot - the settings scope snapshot.
     * @returns whether the theme is on, or `undefined` when unreadable.
     */
    function selectedOf(snapshot) {
      if (snapshot.status !== 'ready') return undefined
      const value = snapshot.value !== null && typeof snapshot.value === 'object' ? snapshot.value : {}
      return value.selected === true
    }

    /** The 16px window glyph the cube wears, in `currentColor`. */
    function WindowIcon() {
      return React.createElement(
        'svg',
        { width: 16, height: 16, viewBox: '0 0 16 16', 'aria-hidden': true, focusable: false },
        React.createElement('rect', { x: 1.5, y: 2.5, width: 13, height: 11, fill: 'none', stroke: 'currentColor' }),
        React.createElement('rect', { x: 1.5, y: 2.5, width: 13, height: 2.5, fill: 'currentColor' }),
      )
    }

    /**
     * Build the cube row over one bound settings scope.
     * @param scope - the scope bound to the win2k namespace.
     * @param t - translate function bound to this plugin's locale namespace.
     * @param toggle - write the next selection.
     * @returns the component the slot renders.
     */
    function createRow(scope, t, toggle) {
      // The row is this scope's only reader, so the subscription lives here.
      const subscribe = (listener) => scope.subscribe(listener)
      const getSnapshot = () => scope.getSnapshot()

      return function Win2kRow() {
        const snapshot = React.useSyncExternalStore(subscribe, getSnapshot)
        const selected = selectedOf(snapshot)
        const writable = snapshot.writable

        // A namespace this deployment does not serve renders no trace of itself.
        if (selected === undefined) return null

        return React.createElement(
          'div',
          { className: 'dw-group' },
          React.createElement('div', { className: 'dw-title' }, t('title')),
          React.createElement(
            'div',
            { className: 'dw-cubes' },
            React.createElement(
              'button',
              {
                type: 'button',
                className: `dw-cube${selected ? ' dw-cube-selected' : ''}`,
                'aria-pressed': selected,
                title: t('cubeHint'),
                onClick: () => { toggle(!selected) },
              },
              React.createElement(WindowIcon),
              t('label'),
            ),
          ),
          selected
            ? React.createElement('div', { className: 'dw-desc' }, t('override'))
            : null,
          writable ? null : React.createElement('div', { className: 'dw-desc' }, t('readOnly')),
        )
      }
    }

    /**
     * Mount every surface: the token layer, the chrome scope, and the cube row.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const theme = ctx.theme
      const t = ctx.locale.bind(LOCALE_NS)
      ctx.effect(
        () => ctx.locale.register(LOCALE_NS, { en, zh }),
        'dsh-win2k: locale dictionary',
      )

      const scope = ctx.settingsScope.bind({ namespace: NAMESPACE })

      /**
       * The override layer this plugin currently owns, when the skin is on.
       *
       * A stacked token layer is the only shape that sticks: the durable theme
       * preference keeps whatever built-in the user picked, so nothing here
       * races the Appearance row, survives a settings write, or is lost on
       * reload — the flag in this plugin's own namespace is the whole state.
       */
      let layer

      /** Session-local selection, used when the deployment cannot persist one. */
      let session

      /** Release the layer this plugin holds, if it holds one. */
      const retract = () => {
        if (layer === undefined) return
        layer()
        layer = undefined
      }

      /** Stack the palette while the flag is on, and retract it when it is off. */
      const sync = () => {
        const on = session !== undefined ? session : selectedOf(scope.getSnapshot()) === true
        if (on && layer === undefined) {
          layer = theme.overrideTokens(THEME_ID, OVERRIDES)
        } else if (!on) {
          retract()
        }
        if (typeof document !== 'undefined') {
          document.body.toggleAttribute(ACTIVE_ATTRIBUTE, on)
        }
      }

      const report = (cause) => {
        console.warn(`[win2k] ${cause instanceof Error ? cause.message : String(cause)}`)
      }

      const toggle = (next) => {
        if (scope.getSnapshot().writable) {
          // The write comes back through the scope subscription, so the palette
          // never moves before the document holds the choice.
          Promise.resolve(scope.set('selected', next)).catch(report)
          return
        }
        session = next
        sync()
      }

      ctx.effect(() => scope.subscribe(sync), 'dsh-win2k: settings subscription')
      ctx.effect(() => () => {
        retract()
        if (typeof document !== 'undefined') document.body.removeAttribute(ACTIVE_ATTRIBUTE)
      }, 'dsh-win2k: chrome scope')
      sync()

      const Row = createRow(scope, t, toggle)

      // The owner declares the slot; injecting waits for it to exist, so this
      // registration does not depend on plugin load order. Order 12 keeps the
      // cube directly under ui-theme's Appearance row (order 10).
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'win2k-theme',
        order: 12,
      }, Row))
    }

    exports.apply = apply
    exports.inject = ['slots', 'settingsScope', 'theme', 'locale']
    return module.exports
  },
})
