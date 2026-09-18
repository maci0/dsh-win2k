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
      '--dsw-alias-state-warn-label': '#808000',
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
      '--dsw-font-family': '"Win2k UI", "Microsoft Sans Serif", "MS Sans Serif", Tahoma, "DejaVu Sans", Verdana, sans-serif',
      '--ds-font-family-code': '"Win2k Mono", "Lucida Console", "Courier New", monospace',
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
    /* The fonts are the real UI faces, subset: Microsoft Sans Serif and Tahoma
       regular/bold for text, Lucida Console for code, all lifted from the
       same Windows 2000 media as the icons. */
    /* One template literal with the indentation stripped: the emitted sheet
       stays a single line, and the existing test asserts it is appended once. */
    const CSS = `
@font-face{font-family:"Win2k UI";font-weight:400;font-style:normal;font-display:swap;src:url("data:font/woff2;base64,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") format("woff2")}
@font-face{font-family:"Win2k UI";font-weight:700;font-style:normal;font-display:swap;src:url("data:font/woff2;base64,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") format("woff2")}
@font-face{font-family:"Win2k Tahoma";font-weight:400;font-style:normal;font-display:swap;src:url("data:font/woff2;base64,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") format("woff2")}
@font-face{font-family:"Win2k Mono";font-weight:400;font-style:normal;font-display:swap;src:url("data:font/woff2;base64,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") format("woff2")}
body[data-dsw-win2k]{--dsw-corner-shape:square}
/* Windows 2000 had no easing: hover, selection and opening a control changed
   state on the next frame. The client animates all of it. */
body[data-dsw-win2k],body[data-dsw-win2k] *{transition-duration:0s !important;transition-delay:0s !important}
/* Windows 2000 shipped no font smoothing at all: glyphs landed on whole pixels.
   The client asks for antialiased text, which is the single most modern-looking
   thing left on the page. */
body[data-dsw-win2k],body[data-dsw-win2k] *{-webkit-font-smoothing:none}
/* The real shell bitmaps are 16px art; keep them square when a rule draws
   them at 14 or 15px instead of letting the browser smear them. */
body[data-dsw-win2k] svg{image-rendering:pixelated}
/* corner-shape only reshapes a rounded corner into a bevel; Windows 2000 had no
   radius at all, so every rounded surface is squared outright. */
body[data-dsw-win2k],body[data-dsw-win2k] *{border-radius:0}
body[data-dsw-win2k]{--dw-raised:inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #d4d0c8;--dw-sunken:inset 1px 1px #0a0a0a, inset -1px -1px #ffffff, inset 2px 2px #808080, inset -2px -2px #d4d0c8;--dsh-scrollbar-width:16px;--dsh-scrollbar-thumb:#d4d0c8;--dsh-scrollbar-thumb-hover:#c0bdb6;--dsh-scrollbar-thumb-border:0px;--dsh-scrollbar-track-margin:0px;--dsw-mask-blur:0px;--dsw-linear-gradient-think:linear-gradient(180deg,#ffffff 0,#ffffff 100%);--dsw-linear-think-select:linear-gradient(180deg,#d4d0c8 0,#d4d0c8 100%)}
body[data-dsw-win2k] ::selection{background:#0a246a;color:#ffffff}
body[data-dsw-win2k],body[data-dsw-win2k] *{--dsw-elevation-stroke:0 0 0 1px var(--dsw-elevation-stroke-color);--dsw-elevation-stroke-color:#404040;--dsw-elevation-panel:0 0 0 1px #404040,2px 2px 0 rgba(0,0,0,.35);--dsw-elevation-prominent:0 0 0 1px #404040,2px 2px 0 rgba(0,0,0,.4);--dsw-elevation-soft:0 0 0 1px #808080,2px 2px 0 rgba(0,0,0,.3);--dsw-shadow-lv1:0 0 0 1px #000000,1px 1px 0 rgba(0,0,0,.25);--dsw-shadow-lv2:0 0 0 1px #000000,2px 2px 0 rgba(0,0,0,.3);--dsw-shadow-lv3:0 0 0 1px #000000,2px 2px 0 rgba(0,0,0,.35);--ds-transition-duration:0s;--ds-transition-duration-fast:0s;--ds-transition-duration-slow:0s}
body[data-dsw-win2k] ::-webkit-scrollbar-track{background:repeating-conic-gradient(#ffffff 0% 25%,#d4d0c8 0% 50%) 0 0/2px 2px;box-shadow:inset 1px 1px 0 #404040,inset -1px -1px 0 #ffffff}
body[data-dsw-win2k] ::-webkit-scrollbar-thumb{border-radius:0;background:#d4d0c8;background-clip:border-box;box-shadow:inset -1px -1px #0a0a0a, inset 1px 1px #ffffff, inset -2px -2px #808080, inset 2px 2px #d4d0c8}
body[data-dsw-win2k] ::-webkit-scrollbar-thumb:hover{background-color:#c0bdb6}
/* The corner where two scrollbars meet carried the shell's size grip: three
   etched dots stepping down into it. */
body[data-dsw-win2k] ::-webkit-scrollbar-corner{background-color:#d4d0c8;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M9 13h1v1H9zM11 13h1v1h-1zM13 13h1v1h-1zM11 11h1v1h-1zM13 11h1v1h-1zM13 9h1v1h-1z' fill='%23808080'/%3E%3Cpath d='M10 14h1v1h-1zM12 14h1v1h-1zM14 14h1v1h-1zM12 12h1v1h-1zM14 12h1v1h-1zM14 10h1v1h-1z' fill='%23ffffff'/%3E%3Cpath d='M10 13h1v1h-1zM12 13h1v1h-1zM12 11h1v1h-1zM14 11h1v1h-1zM14 9h1v1h-1z' fill='%23000000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:bottom right}
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
/* !important on purpose: components set their own checked colour through
   accent-color, and a checkbox that keeps its native appearance paints a
   black fill with a white tick — the client's brand colour, not a win2k box. */
body[data-dsw-win2k] input[type="checkbox"]{appearance:none !important;-webkit-appearance:none !important;accent-color:auto;box-sizing:border-box;width:13px !important;height:13px !important;margin:0 4px 0 0;background-color:#ffffff;box-shadow:var(--dw-sunken);border-radius:0}
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
/* win2k tab control: every tab carries the 3D edge, unselected tabs sit two
   pixels lower, and the selected one is a white face ringed in shadow with a
   highlight inside it, joined to the page below. */
body[data-dsw-win2k] [role="tab"]{background-color:#d4d0c8;box-shadow:inset -1px -1px #404040,inset 1px 1px #ffffff;border-radius:0;margin-top:2px;padding:0 10px;display:flex;align-items:center;justify-content:center;line-height:16px}
body[data-dsw-win2k] [role="tab"][aria-selected="true"]{background-color:#ffffff;color:#000000;margin-top:0;box-shadow:inset 0 1px 0 #404040,inset 1px 0 0 #404040,inset -1px 0 0 #404040,inset 1px 1px 0 #ffffff}
body[data-dsw-win2k] [role="tab"][aria-selected="true"]::after{background:transparent}
/* The Session header is this page's title bar. Windows 2000 never dropped the
   navy caption, so the title row takes ActiveTitle with white ink — but only
   once the header really carries a title (nav is the breadcrumb cluster, which
   the blank hero state does not render, and a caption with no words is worse
   than no caption). The tab strip below it stays a face control. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]):has(nav) > div:first-child{background-color:#0a246a;background-image:linear-gradient(90deg,#0a246a 0%,#a6caf0 100%)}
/* The gradient runs into GradientActiveTitle, which is light, so the caption
   controls at that end are the grey 3D plates a win2k caption used: the corner
   buttons and the chips, both with dark ink. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) > div:first-child button:is([aria-expanded],[aria-haspopup]){background-color:#d4d0c8;box-shadow:var(--dw-raised);color:#000000}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) > div:first-child button:is([aria-expanded],[aria-haspopup]) *{color:#000000 !important}
/* The seat label in the caption is a bare span, not a button, so it took the
   caption ink and floated on the gradient while its neighbours sat on plates. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) [class*="headerActions"] span[class*="label"]{background-color:#d4d0c8;box-shadow:var(--dw-raised);color:#000000 !important}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) :is([data-conversation-header-corner],.titleRow) button,body[data-dsw-win2k] header:has([data-conversation-header-leading]) button[data-sidebar-right-expand]{background-color:#d4d0c8 !important;box-shadow:var(--dw-raised) !important;color:#000000 !important}
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
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"]:not([aria-expanded]):has(> span:nth-child(3)) > span:first-child:empty::before{content:'';display:block;width:16px;height:16px;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAVUExURQAAAICAgP///8DAwAAA/wAAAP8AAOEyyVgAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABcSURBVAjXVcuxDYAwDETRS0Efj5BTSA+IBays4AFwwf4jICdpuOrrSYckIpIBJJI8IoqQZwZSLaTZiNr1BlJ7SEbstiReQ2rv6kuaT1Ff0t4p6vTf64rdwGZj+ACSrBLPBf7g/wAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] > span:first-child{display:inline-flex;order:-1}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] > span:nth-child(2){display:inline-flex;order:-2}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] span > svg[width="16"]{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAYUExURQAAAJmZAAAAAPHx8f//zP//mczMZv/MmXuLEm8AAAABdFJOUwBA5thmAAAAB3RJTUUH6gkSDzoMq0i6TgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMO0OWscAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDCcU+J7AAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwy0bDpAAAAFRJREFUCNdjYIADQUEhMM1o4hqoAGKIpaWlCQoKMjCIuIBAmAKDSCgIlEEY4eEwkVKISDhcpBQiEh4eHg5ilJaWlpaXKYANTEtLU2BgUgIDBQYMAADGRBkaGGPFHgAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded="true"] span > svg[width="16"]{background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAASUExURQAAAICAgP///8DAwP//AAAAAGAMoYMAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABXSURBVAjXZYvJDYAwDAQ3D/5xxBYQQwXIFBC5AoTSfyso5vgwr9VoFvhIIvcoqjnE4l5FMtJqtqkyjLsTEswcrWo9iWKD423IeJntBMowreO5dWDqAX5crusOYKvuYQsAAAAASUVORK5CYII=")}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"] span > svg[width="14"]{transform:none;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 3h8v8H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M6 4h2v6H6z' fill='%23000000'/%3E%3Cpath d='M4 6h6v2H4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded="true"] span > svg[width="14"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 3h8v8H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M4 6h6v2H4z' fill='%23000000'/%3E%3C/svg%3E")}
/* Composer and hero dropdowns: a win2k combo box ends in a black triangle, not a hairline chevron. */
body[data-dsw-win2k] :where([data-slot="conversation.input.permission"],[data-slot="conversation.input.model"],[data-slot="conversation.hero.agentPreset"]) svg[width="14"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] :where([data-slot="conversation.input.permission"],[data-slot="conversation.input.model"],[data-slot="conversation.hero.agentPreset"]) svg[width="14"] *{display:none}
body[data-dsw-win2k] [data-slot="settings.trigger"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAkUExURQAAAICAgAAAAAAAgMDAwP///wAA/wD/AICAAP//AAD//wCAgMD6xv0AAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABtSURBVAjXY2CAAUEwUGBgEDYGAQUkEZFQEAAxwko7AkVBjHDTTsUgDQWQlMbEoE4FBpGwRaqKQRpKDCLRizqDlCKbGERCg5qmTp3UxCDi4qLZFNGpwKCkpNShNENjEsg6JaYmJgWwxUxKDAgAAHP0GEcm65OnAAAAAElFTkSuQmCC") center/contain no-repeat}
body[data-dsw-win2k] [data-slot="conversation.input.permission"] svg[width="16"]{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAASUExURQAAAICAAMDAwAAAAP//////AHl0XxQAAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAd0SU1FB+oJEhAcERzqsf4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6Mjc6MzErMDA6MDD7OWXnAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjI3OjMxKzAwOjAwimTdWwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyODoxNyswMDowMA2PlU4AAABFSURBVAjXY2BAAoKCEJpR2dAAzBAyYBQGM4TBCIUhKCgsAFIrKCgoCBIScXFxcQEzQkNDQ8EMQUFBIQIigjDtxiBgwAAA/lEKEcI9nooAAAAASUVORK5CYII=") center/contain no-repeat}
body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"][aria-expanded] span > svg[width="16"] *,body[data-dsw-win2k] [data-slot="sidebar.workspaces"] [role="treeitem"] span > svg[width="14"] *,body[data-dsw-win2k] [data-slot="settings.trigger"] svg *,body[data-dsw-win2k] [data-slot="conversation.input.permission"] svg[width="16"] *{display:none}
/* Chrome icons for the controls the client renders outside the tree: the rail
   applet, the new-session and attach buttons, the Workspaces header actions,
   the panel toggle in the caption, the send button, and the per-variant leading
   icon of every tool row (data-variant is on the ToolRow root, so Read, Edit,
   Bash, Search, Code and Think each get their own period bitmap). */
body[data-dsw-win2k] [class*="panelList"] button svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAhUExURQAAAICAgAAAAAAAgMDAwP8AAP///wD/AACAAP8A////ALpVO6wAAAABdFJOUwBA5thmAAAAAWJLR0QGYWa4fQAAAAd0SU1FB+oJEhAVLJVARqYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjE6NDQrMDA6MDCu2jMeAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIxOjQ0KzAwOjAw34eLogAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMTo0NCswMDowMIiSqn0AAABfSURBVAjXYxAEASEGBgZhY2NjYyNkhohLiIuLEwMDg1haWFoamBGaGghWLpYaDFElFgZjpIm4uICUi7iIpaWBlCspiVW0ZU4D6+tqiwoDMzLaUiEMiBqQJS4QS5TAAACivhnN9y3WCAAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] [class*="newSession"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAVUExURQAAAAAAAP///4CAgMDAwL+/AP//AKfc8qkAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABJSURBVAjXY2BgBAEGBgYGISMjIyMBBgZmRTBgYGBWAgFHFIagkCC6iCBMRCUEKuKaKgQRCRMLQhNRDETV7gICjgwMDIIgIMAAAL2yDs9nzMw/AAAAAElFTkSuQmCC") center/contain no-repeat}

body[data-dsw-win2k] [class*="tools"] > button[class*="add"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 3h8v8H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M6 4h2v6H6z' fill='%23000000'/%3E%3Cpath d='M4 6h6v2H4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}

body[data-dsw-win2k] [class*="searchButton"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAbUExURQAAAICAgP///wAAAMDAwAD//wCAgAAA/wAAgPqrAR4AAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEhAfNQvEBuwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjozMTo1MyswMDowMEARS60AAABVSURBVAjXY2AQFBQUZGBgYBBSUlKE0QIMDAzCLkpKzgwMjComTiBaSNUZTIuqBEP4oc4uYHkXExMnZ5B6oXQXEC3i0poO5htbhBkzgEGrAYRmZmAAAIwMDFMFm2KCAAAAAElFTkSuQmCC") center/contain no-repeat}

body[data-dsw-win2k] [class*="headerActions"] > span button svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M1 1h12v12H1z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M1 2h12v2H1z' fill='%230a246a'/%3E%3Cpath d='M3 6h8v1H3z' fill='%23404040'/%3E%3Cpath d='M3 8h8v1H3z' fill='%23404040'/%3E%3Cpath d='M3 10h5v1H3z' fill='%23404040'/%3E%3C/svg%3E") center/14px 14px no-repeat}

body[data-dsw-win2k] [class*="headerActions"] > button svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAVUExURQAAAICAgMDAwP//AP///wAAAAAA//1Yqo8AAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABNSURBVAjXY2CAA0FBATDNqKysCGYIGRkZCQoKMjCIuICAYwCDiBEIGAYwiCgrJycrK4JFVJUgImppaWgiCDUQXYIQEMDAGgoGAQwYAACvExGwSKn6YgAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] button[data-sidebar-right-expand] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 2h14v12H1z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M1 2h14v2H1z' fill='%230a246a'/%3E%3Cpath d='M9 5h5v8H9z' fill='%23d4d0c8' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}

body[data-dsw-win2k] [data-slot="conversation.composer.bar"] button[class*="primary"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 4h14v9H1z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M1 4l7 5 7-5' fill='none' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}

body[data-dsw-win2k] [data-variant="read"] [class*="iconIdle"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAVUExURQAAAICAgP///8DAwAAA/wAAAP8AAOEyyVgAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABcSURBVAjXVcuxDYAwDETRS0Efj5BTSA+IBays4AFwwf4jICdpuOrrSYckIpIBJJI8IoqQZwZSLaTZiNr1BlJ7SEbstiReQ2rv6kuaT1Ff0t4p6vTf64rdwGZj+ACSrBLPBf7g/wAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] [data-variant="write"] [class*="iconIdle"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAVUExURQAAAAAAAICAgACAgAD//8DAwP///9QIdNkAAAABdFJOUwBA5thmAAAAAWJLR0QGYWa4fQAAAAd0SU1FB+oJEhAXNloU3V4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjM6NTQrMDA6MDBmheO9AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIzOjU0KzAwOjAwF9hbAQAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMzo1NCswMDowMEDNet4AAABgSURBVAjXZY7BCcMwEARHuAFfsAoIrkA5NRB0DezjUoL7L8EIBH7kNyzDsEAxMwN4+flpO5SIiK9gG+69CY7hHlXQI2JULSXFNqGlOCbU1FJ+YmYtU0DNfOD6W/LNurHfPCEXZNHbmTkAAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] [data-variant="edit"] [class*="iconIdle"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAVUExURQAAAAAAAICAgACAgAD//8DAwP///9QIdNkAAAABdFJOUwBA5thmAAAAAWJLR0QGYWa4fQAAAAd0SU1FB+oJEhAXNloU3V4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjM6NTQrMDA6MDBmheO9AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIzOjU0KzAwOjAwF9hbAQAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMzo1NCswMDowMEDNet4AAABgSURBVAjXZY7BCcMwEARHuAFfsAoIrkA5NRB0DezjUoL7L8EIBH7kNyzDsEAxMwN4+flpO5SIiK9gG+69CY7hHlXQI2JULSXFNqGlOCbU1FJ+YmYtU0DNfOD6W/LNurHfPCEXZNHbmTkAAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] [data-variant="bash"] [class*="iconIdle"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAbUExURQAAAAAAAP8AAAD/AAAA////AICAgP///8DAwEegVCcAAAABdFJOUwBA5thmAAAAAWJLR0QHFmGI6wAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABgSURBVAjXNY2xEYMwEARXHfzakAt14HEDDmiAgAKUQAlqQWUzYNjkNri5AyAZ/FODAF9+JEKLX8FbMjj5lpyLJ1CKg4v8wNlVtpO6yt5aa3WUvffeq4+kR0h3mevhmjsAdtsWt8JpkCQAAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] [data-variant="search"] [class*="iconIdle"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAbUExURQAAAICAgP///8DAwAAAAAD//wCAgAAA/wAAgCBVBYQAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABsSURBVAjXNczBDYMwEETRzy3HrAkNbEQKsBcpRyJvB5ZogQKogb6jNeL2NDMaEBF5AiRVlRspojGrugNSs74NhtmKqsWk1Y5pXi6k1moODItZCfD6fY5s/fDcS2As3+3olfu5xzPw2NYLOPwBSOYQp5dqiKAAAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] [data-variant="code"] [class*="iconIdle"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAbUExURQAAAAAAAP///4CAgAAAvwAA/8DAwL+/AP//AMgjKH8AAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEhAeN/zRVoEAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MzA6MzkrMDA6MDDrhO85AAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjMwOjM5KzAwOjAwmtlXhQAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjozMDo1NSswMDowMMwDFakAAABVSURBVAjXLYuxCYBAEATnwAJu5Rv4AzG/wELEGt5YTIytXPSNhllmQWYGWGQmkKq1+kBGRJSVpbXWytRd28/y7fuhz6/TX863IKOO4fTO6X8HkyR4ADX5D2eL/IamAAAAAElFTkSuQmCC") center/contain no-repeat}

body[data-dsw-win2k] [data-variant="think"] [class*="iconIdle"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 1h6v1H4z' fill='%23000000'/%3E%3Cpath d='M3 2h8v7H3z' fill='%23000000'/%3E%3Cpath d='M4 3h6v5H4z' fill='%23ffff00'/%3E%3Cpath d='M5 4h2v2H5z' fill='%23ffffff'/%3E%3Cpath d='M5 9h4v1H5z' fill='%23808080'/%3E%3Cpath d='M5 10h4v1H5z' fill='%23404040'/%3E%3Cpath d='M5 11h4v1H5z' fill='%23808080'/%3E%3Cpath d='M6 12h2v1H6z' fill='%23404040'/%3E%3C/svg%3E") center/14px 14px no-repeat}

body[data-dsw-win2k] [data-variant="others"] [class*="iconIdle"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAASUExURQAAAICAgMDAwAAAAAAAv////0GoofMAAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAd0SU1FB+oJEhAcF/WJFMsAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyODoyMyswMDowMHdPtr4AAAAuSURBVAjXY2CAAkEIYBBSAgFhBiEXF1fTYGEGIbCwMINQKAgQTwtC9RlDAMwaADt9D+2Z5B0YAAAAAElFTkSuQmCC") center/contain no-repeat}

body[data-dsw-win2k] [class*="panelList"] button svg *,body[data-dsw-win2k] [class*="newSession"] svg *,body[data-dsw-win2k] [class*="tools"] > button[class*="add"] svg *,body[data-dsw-win2k] [class*="searchButton"] svg *,body[data-dsw-win2k] [class*="headerActions"] button svg *,body[data-dsw-win2k] button[data-sidebar-right-expand] svg *,body[data-dsw-win2k] [data-slot="conversation.composer.bar"] button[class*="primary"] svg *,body[data-dsw-win2k] [data-variant] [class*="iconIdle"] svg *{display:none}
/* Windows 2000 metrics, not just colours: the caption is a 20px bar set in 12px
   bold with 16x14 grey control plates on it; a menu row is 18px; the scrollbar
   carries real arrow buttons instead of bare track. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) > div:first-child{height:20px;min-height:20px;font-family:"Win2k Tahoma",Tahoma,sans-serif;font-size:12px;font-weight:700;line-height:20px}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) > div:first-child button{height:18px;min-height:18px;padding:0 4px;font-size:12px}
body[data-dsw-win2k] [role="menu"]{padding:2px;min-width:max-content}
body[data-dsw-win2k] [role="menuitem"],body[data-dsw-win2k] [role="menuitemradio"]{height:18px;min-height:18px;padding:0 6px;font-size:12px}
body[data-dsw-win2k] [role="menu"] span{font-size:12px;line-height:16px}
body[data-dsw-win2k] ::-webkit-scrollbar-button{display:block;width:16px;height:16px;background-color:#d4d0c8;box-shadow:var(--dw-raised)}
body[data-dsw-win2k] ::-webkit-scrollbar-button:vertical:start:increment,body[data-dsw-win2k] ::-webkit-scrollbar-button:vertical:end:decrement,body[data-dsw-win2k] ::-webkit-scrollbar-button:horizontal:start:increment,body[data-dsw-win2k] ::-webkit-scrollbar-button:horizontal:end:decrement{display:none}
body[data-dsw-win2k] ::-webkit-scrollbar-button:vertical:start{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M3 10l5-5 5 5z' fill='%23000000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
body[data-dsw-win2k] ::-webkit-scrollbar-button:vertical:end{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M3 6l5 5 5-5z' fill='%23000000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
/* Icon margins the way the shell spent them: a 16px glyph, a 4px gap, a 22px
   row, 12px label text. The client ships 34px rows and 6px gaps. */
body[data-dsw-win2k] [class*="projectRow"],body[data-dsw-win2k] [class*="sessionRow"]{height:22px;gap:4px;font-size:12px;line-height:16px}
body[data-dsw-win2k] [class*="projectRow"] > span,body[data-dsw-win2k] [class*="sessionRow"] > span{line-height:16px}
body[data-dsw-win2k] [class*="projectRow"] > span:first-child,body[data-dsw-win2k] [class*="projectRow"] > span:nth-child(2),body[data-dsw-win2k] [class*="sessionRow"] > span:first-child{flex:0 0 auto;width:16px;height:16px;min-height:16px}
body[data-dsw-win2k] [class*="projectRow"] svg,body[data-dsw-win2k] [class*="sessionRow"] svg{flex:0 0 auto;margin:0}
/* Menus: a 16px gutter and a 4px gap, like the shell menu. */
body[data-dsw-win2k] [role="menu"] > [role="menuitem"],body[data-dsw-win2k] [role="menu"] > [role="menuitemradio"]{gap:4px}
/* Caption controls are 16x14 plates flush to the right edge. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) > div:first-child button{height:16px !important;min-height:16px !important;padding:0 2px !important}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) > div:first-child{padding-left:3px}
/* Status panes carry 6px either side of the text, and the tool row keeps the
   same 4px gap between its glyph and its label. */
body[data-dsw-win2k] [class*="_dock"] button[class*="pill"],body[data-dsw-win2k] [class*="_dock"] button[class*="trigger"]{padding:0 6px}
body[data-dsw-win2k] [data-disclosure-row]{gap:4px}
body[data-dsw-win2k] [data-disclosure-row] svg{flex:0 0 auto}
/* The logo strip is a win2k title area, not a badge wall: flat face, a 16px
   mark, a 12px bold name and the build string as 11px grey text beside it —
   the client draws that string as a 6px black badge. */
body[data-dsw-win2k] [class*="logoRow"]{padding:3px 0 3px 3px}
/* The brand block is a title strip, not a push button: its hover is a flat tint.
   A raised plate there sliced across the build line, which hangs below the
   button box the client gives it. */
body[data-dsw-win2k] button[class*="brand"]{background-color:transparent;box-shadow:none}
body[data-dsw-win2k] [class*="logoRow"] > button[class*="brand"]{height:auto;min-height:26px;align-items:center}
body[data-dsw-win2k] button[class*="brand"]:hover{background-color:#e4e1dc;box-shadow:none}
body[data-dsw-win2k] [class*="brandMark"],body[data-dsw-win2k] [class*="brandMark"] svg{width:16px;height:16px}
body[data-dsw-win2k] [class*="brandName"]{height:auto;gap:4px;font-size:12px;font-weight:700;line-height:14px;letter-spacing:0}
body[data-dsw-win2k] [class*="localBuildBrand"]{height:auto;gap:0;min-width:0}
body[data-dsw-win2k] [class*="localBuildTitle"]{font-size:12px;line-height:14px}
body[data-dsw-win2k] [class*="buildVersion"]{height:auto;padding:0;border-radius:0;background:transparent;color:#404040;font-family:"Win2k UI",sans-serif;font-size:11px;font-weight:400;line-height:13px}
body[data-dsw-win2k] [class*="logoRow"] [class*="iconButton"]{width:22px;height:22px}
/* The cursor set off the same CD: the windows default arrow, the I-beam, the
   hourglass, the four-way move and the column resize. Each carries its original
   hotspot. Windows 2000 hand and help cursors came from IE rather than the
   shell set, so links keep the platform pointer. */
body[data-dsw-win2k]{cursor:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAd0SU1FB+oJEhAVBdfy3soAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjE6MDUrMDA6MDCM5zZQAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIxOjA1KzAwOjAw/bqO7AAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMTowNSswMDowMKqvrzMAAACKSURBVEjH7ZJLDoAwCERh4v2vjAtTW+xHBuPCRFbtUB4DqcgfR1i+FE8ROOuTiOIgjUA95hBoLxkE/JVH4CqwCPQSh8BIZBAYy3EEZokoAvNUDIFVMoLYRqJ6ioYBWhsuiyYjqIgqtUAHUKJrP641ps0oIBwo7cAH5QH3T3gHlIeXHJR/kF7tp2IHGJMmHX5YzzkAAAAASUVORK5CYII=") 2 4, auto}
body[data-dsw-win2k] input,body[data-dsw-win2k] textarea,body[data-dsw-win2k] [contenteditable="true"],body[data-dsw-win2k] [role="textbox"]{cursor:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAd0SU1FB+oJEhAVBdfy3soAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjE6MDUrMDA6MDCM5zZQAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIxOjA1KzAwOjAw/bqO7AAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMTowNSswMDowMKqvrzMAAAAySURBVEjHY2AYBQMPGHGI/4fL/serjgD4D9WOBzBR6oVRA0YNGDVg1AAYoHGRNgroAwBRyAYjIS4YBwAAAABJRU5ErkJggg==") 15 15, text}
body[data-dsw-win2k] [aria-busy="true"],body[data-dsw-win2k] [data-state="running"]{cursor:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAd0SU1FB+oJEhAVBdfy3soAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjE6MDUrMDA6MDCM5zZQAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIxOjA1KzAwOjAw/bqO7AAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMTowNSswMDowMKqvrzMAAACjSURBVEjH1ZVLDoAgDERbwv2vPG4EKekvAYyyMEJ4QzvVQvT7wfMCECKCqQlNecA0L6spVH1Zz4PzAn4awU6AzQgwWbjBg1MC3J8sZkm3AL4rwQTi+40UB0y7pYSNO/V6JDzcLXiT8PAPlzE/lk0sET6UU/1Bgg9JbtSiKBHeCCsKK4WOQ0ikPRhxuO2lZHBPQmnrUVcO2zq921RP3Avh3bZ3XE7RPD0ZQAJLAAAAAElFTkSuQmCC") 16 16, progress}
body[data-dsw-win2k] [draggable="true"]{cursor:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAd0SU1FB+oJEhAVBdfy3soAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjE6MDUrMDA6MDCM5zZQAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIxOjA1KzAwOjAw/bqO7AAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMTowNSswMDowMKqvrzMAAACgSURBVEjH7VRBDsMwCLOj/f/L9FClS6AydNymcovAjgUG4I00zLpw0xTU8DNtIH8gmHBNwQpcUXyEglb3Lh1ZE0f3i0Bg8seYHb5AzhUAnbXGM3ikYISbL3dvbEOlhwMm3PXNTYq2gsVI5KTgouvuvbpyayJZcd9uajfGnMLvRNgFyknGbNvKYp1r2sQ6+3vwUEH7IqF4E5PID0qF4t/jAE9HUBJAbOReAAAAAElFTkSuQmCC") 16 16, move}
body[data-dsw-win2k] [style*="col-resize"],body[data-dsw-win2k] [class*="widthHandle"]{cursor:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAQAAADZc7J/AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAd0SU1FB+oJEhAVBdfy3soAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MjE6MDUrMDA6MDCM5zZQAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjIxOjA1KzAwOjAw/bqO7AAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyMTowNSswMDowMKqvrzMAAABYSURBVEjH7ZFBDoBACAPb/f+f68HEKCC62dMmnSswJQAYY0okaaY2YgtbPREVY2a8UjCPqx0/O8gk+JN+C7sUyxuEE0Jov5DrjyOSXXpcvhB8K16XN2Z3DgxPKvjnR6G5AAAAAElFTkSuQmCC") 15 16, col-resize}
/* The horizontal bar gets its own arrows; the vertical pair is above. */
body[data-dsw-win2k] ::-webkit-scrollbar-button:horizontal:start{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M10 3l-5 5 5 5z' fill='%23000000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
body[data-dsw-win2k] ::-webkit-scrollbar-button:horizontal:end{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M6 3l5 5-5 5z' fill='%23000000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center}
/* A win2k push button is 23px tall; the client ships 28-32px controls. */
body[data-dsw-win2k] button{min-height:23px}
body[data-dsw-win2k] [role="tab"]{min-height:20px}
/* A win2k menu reserves a 16px gutter on the left for the check, and the client
   parks its check span at the right: move it and give a checked row the tick. */
body[data-dsw-win2k] [role="menuitemradio"] > [class*="check"]{order:-1;flex:0 0 auto;width:16px;height:16px;background-repeat:no-repeat;background-position:left center;background-size:12px 12px}
body[data-dsw-win2k] [role="menuitemradio"][aria-checked="true"] > [class*="check"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M2 8l3 4 9-10' fill='none' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E")}
/* The last metric gap: the client ships a 38px primary button and 28px combo
   chips, Windows 2000 shipped a 23px push button and 22px tool/combo controls. */
body[data-dsw-win2k] [class*="newSession"]{height:23px;min-height:23px}
body[data-dsw-win2k] [class*="tools"] > button[class*="add"],body[data-dsw-win2k] [data-slot="conversation.input.permission"] button,body[data-dsw-win2k] [data-slot="conversation.input.model"] button,body[data-dsw-win2k] [class*="tools"] [class*="modes"] button{height:22px;min-height:22px}
body[data-dsw-win2k] [class*="panelList"] button{height:22px;min-height:22px}
/* Defragmenter blocks. The shell drew its disk map and its legend swatches as
   flat 2px clusters, so the row state marks become cluster blocks and every
   progress bar gets the segmented strip. */
body[data-dsw-win2k] :where([class*="_dot_"]){background-color:transparent;background-image:repeating-conic-gradient(currentColor 0% 25%,transparent 0% 50%);background-size:4px 4px;background-position:1px 1px}
body[data-dsw-win2k] :where([class*="_dot_"])::before,body[data-dsw-win2k] :where([class*="_dot_"])::after{display:none}
body[data-dsw-win2k] :where([class*="_matrix_"]) rect{opacity:.25}
body[data-dsw-win2k] progress,body[data-dsw-win2k] [role="progressbar"]{box-sizing:border-box;height:14px;padding:1px;border:0;background-color:#d4d0c8;box-shadow:inset 1px 1px #0a0a0a,inset -1px -1px #ffffff;overflow:hidden}
body[data-dsw-win2k] progress::-webkit-progress-bar{background:repeating-linear-gradient(90deg,#d4d0c8 0 6px,transparent 6px 8px)}
body[data-dsw-win2k] progress::-webkit-progress-value,body[data-dsw-win2k] [role="progressbar"] > *{background:repeating-linear-gradient(90deg,#0a246a 0 6px,transparent 6px 8px)}
/* The defragmenter map, in the one place this page has room for it. Framed, so
   it reads as a map panel rather than a stray speckle on the page. */
body[data-dsw-win2k] [class*="composerHero"]{background-image:repeating-conic-gradient(#eceae6 0% 25%,transparent 0% 50%);background-size:8px 8px;box-shadow:inset 1px 1px #808080,inset -1px -1px #ffffff;padding:10px}
/* Windows 2000 form-control identity: a combo is a white sunken field with a
   raised grey arrow button at its end. The client draws every one of these as a
   grey menu button, so they are re-cut: field white, caret button plated. */
body[data-dsw-win2k] :where([data-slot="conversation.input.permission"],[data-slot="conversation.input.model"]) button,body[data-dsw-win2k] [class*="selector"],body[data-dsw-win2k] [class*="seat"],body[data-dsw-win2k] [class*="heroWorkspaceRow"] button[class*="workspace"]{background-color:#ffffff;box-shadow:var(--dw-sunken);color:#000000}
/* The caret is not always a direct child, so key it by its 12/14px box: the
   control's own leading icon (16px) keeps sitting in the white field. */
body[data-dsw-win2k] :where([data-slot="conversation.input.permission"],[data-slot="conversation.input.model"]) button svg[width="14"],body[data-dsw-win2k] [class*="selector"] svg[width="14"],body[data-dsw-win2k] [class*="seat"] svg[width="14"],body[data-dsw-win2k] [class*="heroWorkspaceRow"] button[class*="workspace"] svg[width="12"],body[data-dsw-win2k] [class*="heroWorkspaceRow"] button[class*="workspace"] svg[width="14"]{box-sizing:border-box;background-color:#d4d0c8;box-shadow:var(--dw-raised)}
body[data-dsw-win2k] select{padding-right:20px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 21' shape-rendering='crispEdges'%3E%3Cpath d='M0 0h16v21H0z' fill='%23d4d0c8'/%3E%3Cpath d='M0 0h16v1H0zM0 0h1v21H0z' fill='%23ffffff'/%3E%3Cpath d='M15 1h1v20H15zM1 20h15v1H1z' fill='%230a0a0a'/%3E%3Cpath d='M14 2h1v18H14zM2 19h13v1H2z' fill='%23808080'/%3E%3Cpath d='M5 8h6v2H5zM6 10h4v2H6zM7 12h2v1H7z' fill='%23000000'/%3E%3C/svg%3E"),url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 21' shape-rendering='crispEdges'%3E%3Cpath d='M0 0h16v21H0z' fill='%23d4d0c8'/%3E%3Cpath d='M0 0h16v1H0zM0 0h1v21H0z' fill='%23ffffff'/%3E%3Cpath d='M15 1h1v20H15zM1 20h15v1H1z' fill='%230a0a0a'/%3E%3Cpath d='M14 2h1v18H14zM2 19h13v1H2z' fill='%23808080'/%3E%3Cpath d='M5 8h6v2H5zM6 10h4v2H6zM7 12h2v1H7z' fill='%23000000'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 1px center,right 1px center;background-size:16px 21px,16px 21px}
/* Windows 2000 etched its disabled labels — grey text, one-pixel highlight
   under it — and drew keyboard focus as a dotted rectangle inside the control. */
/* Caption text is exempt: a win2k caption keeps its own ink however inactive. */
body[data-dsw-win2k] :disabled:not(header *),body[data-dsw-win2k] [aria-disabled="true"]:not(header *){color:#808080 !important;text-shadow:1px 1px 0 #ffffff}
/* The dotted rectangle is for controls whose label is the target — buttons, tabs,
   checkboxes. A text field shows a caret instead: win2k never drew a dotted
   frame around a paragraph, and the composer is focused the moment the app
   loads, so the whole input wore one. */
body[data-dsw-win2k] :focus-visible:not(textarea):not(input):not(select):not([contenteditable="true"]):not([role="textbox"]){outline:1px dotted #000000;outline-offset:-1px}
/* A win2k status bar is separated from the client area by a groove: one
   highlight line over one shadow line, panes split by raised separators. */
body[data-dsw-win2k] [class*="_dock"]{box-shadow:inset 0 1px #ffffff,inset 0 2px #808080}
/* The pane splitter is an eight-pixel invisible hit strip. Windows 2000 drew a
   four-pixel face bar with a groove down the middle of it. */
body[data-dsw-win2k] [class*="_handle"]{background-image:linear-gradient(90deg,#ffffff 0 1px,#d4d0c8 1px 3px,#808080 3px 4px);background-size:4px 100%;background-position:center;background-repeat:no-repeat;background-color:transparent}
/* Pager arrows: the client draws chevrons, the shell drew solid triangles. */
body[data-dsw-win2k] [class*="pager"] > button:first-child svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M10 2L4 8l6 6z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [class*="pager"] > button:last-child svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M6 2l6 6-6 6z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [class*="pager"] > button:first-child svg *,body[data-dsw-win2k] [class*="pager"] > button:last-child svg *{display:none}
/* Dialog push buttons were 75px wide whatever their label: the System Properties
   shot on the CD shows OK / Cancel / Apply all the same width. Icon-only
   controls keep their box. */
body[data-dsw-win2k] [role="dialog"] button:not(:has(svg)),body[data-dsw-win2k] [class*="footer"] button:not(:has(svg)){min-width:75px}
/* A win2k task pane — the Add/Remove Programs rail on the CD — marks the
   current item with a white face and black ink. Navy is what the shell used
   for a list view or tree selection, not for a task list. */
body[data-dsw-win2k] [role="dialog"] [class*="navList"] button[aria-current]:not([aria-current="false"]){background-color:#ffffff;color:#000000;box-shadow:inset 1px 1px #ffffff,inset -1px -1px #808080}
/* A win2k status bar puts an icon in its last pane (the shell's is "My
   Computer"); the rest are text. The client hides all three. */
body[data-dsw-win2k] [class*="_dock"] > [class*="root"]:last-child button[class*="trigger"] svg{display:block;width:16px;height:16px;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAASUExURQAAAICAgMDAwAAAAP///wCAAM8hK9cAAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAd0SU1FB+oJEhElEGSrZuUAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNzozNzoxNiswMDowMEbrwzIAAAA4SURBVAjXY2AgCQiCgQADoxIYCDOIuICAozCDEIivqghlKIEYYLUgBliNojBUt6ABA7MxGGCxAAAAhAkH5CXR+wAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] [class*="_dock"] > [class*="root"]:last-child button[class*="trigger"] svg *{display:none}
/* The goal banner's three controls were the client's own glyphs, unpainted:
   an hourglass to pause, the shell's edit page, and the full recycle bin. */
body[data-dsw-win2k] [class*="_dock"] [class*="actions"] > button[class*="iconBtn"]:nth-child(1) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAhUExURQAAAICAgP8AAP//AAAAgAAAAAD//wD/AMDAwP///4AAAEo1u2UAAAABdFJOUwBA5thmAAAAAWJLR0QJ8dml7AAAAAd0SU1FB+oJEhEpA0ygaDcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNzo0MTowMyswMDowMPxcic8AAABPSURBVAjXY2AQBAMGBiETFxcXVwYGsRIXl4hQBgbJmTNnzhRlWKS0EkyHhkaCackZUFoQQjO2QtTB1EvMCAUBBknBAAYQWKS0AEyHhoL5AFOZHE7goUw3AAAAAElFTkSuQmCC") center/contain no-repeat}
body[data-dsw-win2k] [class*="_dock"] [class*="actions"] > button[class*="iconBtn"]:nth-child(2) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAbUExURQAAAICAAAAAAP//AMDAwICAgP///wD/AP8AAHgGAi4AAAABdFJOUwBA5thmAAAAAWJLR0QGYWa4fQAAAAd0SU1FB+oJEhEpA0ygaDcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNzo0MTowMyswMDowMPxcic8AAABVSURBVAjXLcvRCYAwDATQ86MDBB0gFBxAskK6gJAMIG1mcHxp4/08juOAjYiIgV1ELgZmPRjwiOippePv/iztPZc+cq+tdkaJ/BVV1caAzTBQzOzGB03+Fbjz5E1KAAAAAElFTkSuQmCC") center/contain no-repeat}
body[data-dsw-win2k] [class*="_dock"] [class*="actions"] > button[class*="iconBtn"]:nth-child(3) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAASUExURQAAAICAgP///8DAwAAAAACAAHUvVYgAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEhEpA0ygaDcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNzo0MTowMyswMDowMPxcic8AAABUSURBVAjXHczBDcAgDANAI3WAuoUBCBMkUf482KBi/1Wq4M/ZHwOFNzJ8TqF1IYDXhopUvG7De7pNWFHCmx+/7Zy5PUWL0JThWgFcdJ15vMgj1gJ+QNALBJVw/aIAAAAASUVORK5CYII=") center/contain no-repeat}
body[data-dsw-win2k] [class*="_dock"] [class*="actions"] > button[class*="iconBtn"] svg *{display:none}
/* The goal banner's own mark: the shell's tracked-task clipboard. */
body[data-dsw-win2k] [class*="goalGlyph"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAQAAAC1QeVaAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAd0SU1FB+oJEhEqH3OMZ7sAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNzo0MjozMSswMDowMA57JAYAAABQSURBVBjTrc5BDoAgDETRB/HgXs2TjQtRJBFWTjLd/Py2QIShoCIRe3qf7ElE8urt1sXWC1KUZ/Zs2kcGZ4DdyMz0m1ktsoQbxxSWz4PtvxP9qyvDrtqJvwAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] [class*="goalGlyph"] svg *{display:none}
/* The session hover card is the client's dark tooltip: white ink on a face it
   tints itself. Our face override turned the panel grey and left the ink white,
   so the title vanished. Give it the win2k infotip instead — pale yellow, black
   text, one-pixel black frame, which is what [role="tooltip"] already gets. */
/* The card is position:fixed and rooted at the body, not inside the overlay
   layer — and "copyable" is not unique to it: every click-to-copy value in the
   trajectory request card carries the same class. Scoped to the body child so
   those values keep their own styling instead of turning into yellow boxes. */
body[data-dsw-win2k] > [class*="copyable"]{background-color:#ffffe1;box-shadow:0 0 0 1px #000000;border-radius:0}
body[data-dsw-win2k] > [class*="copyable"] *{color:#000000 !important}
/* A plugin name in a list is text, not a push button; the plate rule had put a
   3D box around every one of them. */
body[data-dsw-win2k] [class*="cardTitle"]{background-color:transparent;box-shadow:none;color:#000000;font-weight:700}
body[data-dsw-win2k] [class*="cardTitle"]:hover{text-decoration:underline;background-color:transparent}
/* A disclosure title is a label on a line, not a push button: "Session
   plugins" sat in a 3D box because it is a button under the hood. */
body[data-dsw-win2k] button[class*="groupToggle"]{background-color:transparent;box-shadow:none;color:#000000;padding:0}
body[data-dsw-win2k] button[class*="groupToggle"]:hover{background-color:transparent;text-decoration:underline}
/* The caption's split group (folder + caret) carried a one-pixel outline and
   stood four pixels proud of the bar at both ends, so the frame hung below the
   caption. A win2k split button is two plates side by side, no outline. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) [class*="split"]{border:0;height:16px;min-height:16px;box-sizing:border-box}
/* and both halves of it are caption plates, like every other control up there */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) [class*="split"] > button{background-color:#d4d0c8 !important;box-shadow:var(--dw-raised) !important;color:#000000 !important}
/* Diff stats in a tool row sat at 2.6:1 — grey on the plate face. win2k kept
   secondary text readable: it dimmed to #404040, not to the disabled grey. */
body[data-dsw-win2k] [class*="diffStat"],body[data-dsw-win2k] [class*="summarySuffix"]{color:#404040}
/* Hover feedback, win2k style. The client tints interactive surfaces with the
   brand colour at 8% opacity — a modern wash — and on the caption's plates our
   own !important background killed hover altogether. A win2k button highlights
   its face instead: #e4e1dc, one step off the face grey. */
body[data-dsw-win2k] button:hover:not([disabled]):not([aria-disabled="true"]):not([role="menuitem"]):not([role="menuitemradio"]):not([aria-selected="true"]):not([aria-current]):not([class*="_dock"] *){background-color:#e4e1dc}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) [class*="split"] > button:hover,body[data-dsw-win2k] header:has([data-conversation-header-leading]) [data-conversation-header-corner] button:hover,body[data-dsw-win2k] header:has([data-conversation-header-leading]) button[data-sidebar-right-expand]:hover,body[data-dsw-win2k] header:has([data-conversation-header-leading]) > div:first-child button:is([aria-expanded],[aria-haspopup]):hover{background-color:#e4e1dc !important}
/* Caption controls were 19, 16, 28 and 28 pixels wide — the ellipsis box read as
   a stretched plate next to the folder. A win2k caption used one size for all
   of them. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) [class*="split"] > button,body[data-dsw-win2k] header:has([data-conversation-header-leading]) button[class*="moreButton"],body[data-dsw-win2k] header:has([data-conversation-header-leading]) [data-conversation-header-corner] button,body[data-dsw-win2k] header:has([data-conversation-header-leading]) button[data-sidebar-right-expand]{box-sizing:border-box;width:22px;padding:0 !important}
/* The tool rows' glyph sat one pixel off the row border — measured leading slot
   at the row's own x. A win2k list row gave its icon four pixels of margin. */
body[data-dsw-win2k] [data-variant]{padding-left:4px}
/* The trajectory kind tags: TOOL took a mixed olive-brown and ASSISTANT a
   plum, neither in the 16-colour set. TOOL is olive on the pale yellow it
   already had; ASSISTANT is navy on the caption blue. */
body[data-dsw-win2k] [class*="assistantVioletBright"]{color:#000080;background:#a6caf0}
body[data-dsw-win2k] [class*="toolAmber"]{color:#808000;background:#ffffe1}
body[data-dsw-win2k] [class*="subtoolAmber"]{color:#404040;background:#f4f2dc}
/* The timeline's assistant bar is a gradient whose two stops are mixes of navy
   and the error red — both land on plum, and the tag override does not reach
   them because they are custom properties. Redefined on the lane span, so the
   component's own gradient uses win2k navy for decoding and the caption blue
   for time-to-first-token. */
body[data-dsw-win2k] [class*="lanes"] > [class*="span"]{--trajectory-assistant-decoding-color:#000080;--trajectory-assistant-ttft-color:#a6caf0}
/* Type sizes on the win2k grid. The client runs its chrome at 13px and the code
   inline at a fractional 12.25px (0.875em of 14); a win2k dialog was 8pt — 11px
   — with 12px for the caption and tabs. Chrome is unified at 12px, the status
   readouts at 11px, transcript content left alone for reading. */
body[data-dsw-win2k] [class*="newSession"],body[data-dsw-win2k] [class*="panelList"] button,
body[data-dsw-win2k] button[class*="trigger"],body[data-dsw-win2k] [role="tab"],
body[data-dsw-win2k] [class*="seat"],body[data-dsw-win2k] [class*="selector"],
body[data-dsw-win2k] [class*="moreButton"],body[data-dsw-win2k] [class*="iconButton"]{font-size:12px}
body[data-dsw-win2k] [class*="_dock"]{font-size:11px}
body[data-dsw-win2k] :not(pre) > code,body[data-dsw-win2k] [class*="fileMention"]{font-size:12px}
body[data-dsw-win2k] [class*="sectionLabel"],body[data-dsw-win2k] [class*="groupTitle"]{font-size:12px}
/* Controls on the win2k height grid: 22px for a toolbar button around a 16px
   glyph, 23px for a push button. The client ships 28px for both, which is a
   third taller than the shell ever drew. */
body[data-dsw-win2k] button[class*="action"],body[data-dsw-win2k] button[class*="iconButton"],
body[data-dsw-win2k] button[class*="searchButton"],body[data-dsw-win2k] button[class*="close"],
body[data-dsw-win2k] button[class*="moreButton"]{box-sizing:border-box;width:22px;height:22px;min-height:22px;padding:0}
body[data-dsw-win2k] button[class*="_outline"],body[data-dsw-win2k] button[class*="primary"]{height:23px;min-height:23px}
body[data-dsw-win2k] button[class*="selector"]{box-sizing:border-box;height:22px;min-height:22px}
/* an inline file mention follows its line, it is not a control */
body[data-dsw-win2k] [class*="fileMention"]{height:auto;min-height:0;padding:0}
/* Icons are drawn to fill their host box. Several hosts are 15px or a scaled
   13.19px, and a fixed 16px or 14px background was cropping a pixel off one
   edge of every one of them. */
body[data-dsw-win2k] [class*="fileMention"] svg[width],body[data-dsw-win2k] [class*="fileLink"] svg[width],body[data-dsw-win2k] [class*="_tile"] svg[width],body[data-dsw-win2k] [class*="tabStrip"] button svg,body[data-dsw-win2k] button[data-sidebar-right-expand] svg,body[data-dsw-win2k] [class*="iconWrap"] svg,body[data-dsw-win2k] [class*="chevron"] svg,/* !important because the winning declaration could not be located by scanning the
   sheets; the icon was visibly overflowing its plate. */
body[data-dsw-win2k] [class*="iconButton"] svg{background-size:contain !important}
/* Code blocks. The client highlights with shiki against a modern palette —
   magenta keywords, orange parameters, violet functions. Mapped to the
   16-colour set: navy keywords and functions, maroon strings, green comments,
   teal constants, olive parameters, black punctuation.
   Applied whatever the appearance flag says, because this sheet forces the code
   face white and the client's dark palette is unreadable on white. */
body[data-dsw-win2k]{--shiki-token-constant:#008080;--shiki-token-string:#800000;--shiki-token-comment:#008000;--shiki-token-keyword:#000080;--shiki-token-parameter:#808000;--shiki-token-function:#000080;--shiki-token-string-expression:#800000;--shiki-token-punctuation:#000000;--shiki-token-link:#000080}
/* The last four dark-block tokens this sheet did not own — found by diffing every
   token the client's dark appearance overrides against ours. All four would
   have painted dark surfaces inside a light UI: the document preview pane
   (PDF, text and Office bodies) and the two reasoning-block gradients. */
body[data-dsw-win2k]{--dsw-alias-bg-document-preview:#ffffff;--dsw-alias-label-document-preview:#000000;--dsw-linear-gradient-think:linear-gradient(180deg,#ffffe1 20.19%,rgba(255,255,225,0) 100%);--dsw-linear-think-select:linear-gradient(180deg,#e4e1dc 20.19%,rgba(228,225,220,0) 100%)}
/* The sidebar footer's row hung two pixels left of its container, so the Settings
   icon sat four pixels left of the Plugins icon in the row above it. */
body[data-dsw-win2k] [class*="settingsArea"] [class*="triggerRow"]{margin-left:2px}
body[data-dsw-win2k] [role="tooltip"]{background-color:#ffffe1;color:#000000;box-shadow:0 0 0 1px #000000;border-radius:0}
body[data-dsw-win2k] [role="alert"]{background-color:#d4d0c8;color:#000000;box-shadow:var(--dw-raised),2px 2px 0 rgba(0,0,0,.35);border-radius:0}
/* A win2k "on" was a checkbox, not a track with a travelling thumb: 13px
   sunken white box, black tick when set. The client's switch paints a white
   panel with a navy square knob, which reads as a modern toggle. */
body[data-dsw-win2k] [role="switch"]{box-sizing:border-box;width:13px;height:13px;min-height:13px;padding:0;background-color:#ffffff;box-shadow:var(--dw-sunken);border-radius:0}
body[data-dsw-win2k] [role="switch"] > span{display:none}
body[data-dsw-win2k] [role="switch"][aria-checked="true"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M2 8l3 4 9-10' fill='none' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:center;background-size:11px 11px}
body[data-dsw-win2k] [role="separator"]{background-image:linear-gradient(#808080 0 1px,#ffffff 1px 2px)}
body[data-dsw-win2k] hr{border-color:#808080 #ffffff #ffffff #808080;border-style:solid}
body[data-dsw-win2k] td,body[data-dsw-win2k] th{border-color:#808080}
body[data-dsw-win2k] th{background-color:#d4d0c8;box-shadow:var(--dw-raised)}
body[data-dsw-win2k] pre{background-color:#ffffff;box-shadow:var(--dw-sunken)}
/* Inline code and file references: a shaded patch and a link, not a field and
   a button. At this density the outlined boxes turned every paragraph into a
   row of little inputs, and the file links were grey 3D plates because they
   are buttons under the hood. */
body[data-dsw-win2k] :not(pre) > code{background-color:#e6e4e0;border:0;box-shadow:none;padding:0 3px}
body[data-dsw-win2k] [class*="fileLink"],body[data-dsw-win2k] [class*="fileMention"]{background-color:transparent !important;box-shadow:none !important;color:#000080;text-decoration:none}
body[data-dsw-win2k] [class*="fileLink"]:hover,body[data-dsw-win2k] [class*="fileMention"]:hover{text-decoration:underline;color:#000080}
.dw-group{display:flex;flex-direction:column;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}
.dw-title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}
.dw-cubes{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap}
.dw-cube{box-sizing:border-box;flex:0 1 180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:20px 32px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:20px;background:transparent;font:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);cursor:pointer}
body[data-dsw-win2k] .dw-cube > svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAABFUExURQQEBMDAwAQEBAAzZoaGhv///2ZmMwD/AGYAZv9mAMxmAE1NTZkzZplmM//MAMyZM5kzM8xmM8yZAP8zM/+ZZv/MzJlmZtGEBY0AAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAd0SU1FB+oJEhARKhhPJpcAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNzo0MiswMDowMH++iQEAAABjSURBVBjTZc9LEoMgEEVRuvESw0cxJtn/UlNApUC8w9Nv0sbMyTU1Yv+JiugIWjOyLHXakg7UGgwVaCf3YOXpOwRLxKcO207mGOCVyKRQ4Hx/gP3LgaMvUsQTbIH5F526ff8DtBkDqHRge/kAAAAASUVORK5CYII=") center/contain no-repeat}
body[data-dsw-win2k] .dw-cube > svg *{display:none}
.dw-cube:hover{background:var(--dsw-alias-interactive-bg-hover)}
.dw-cube-selected{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}
.dw-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}
/* Every remaining disclosure caret in the page — an open tool row, a card
   header, a to-dos row — is the same folded-down chevron: win2k drew a solid
   triangle. Only background-image is set, so a rule that already sized a
   caret keeps its own size. */
body[data-dsw-win2k] [class*="chevron"] svg,body[data-dsw-win2k] [class*="_leading"] > svg[width="14"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E")}
body[data-dsw-win2k] [class*="chevron"] svg *,body[data-dsw-win2k] [class*="_leading"] > svg[width="14"] *{display:none}
/* Any tool variant the table does not name falls back to a document rather
   than an outline glyph. :where() keeps this below the per-variant rules. */
body[data-dsw-win2k] [data-variant] :where([class*="iconIdle"]) svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 1h6l3 3v9H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M9 1l3 3h-3z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M5 6h5v1H5z' fill='%23808080'/%3E%3Cpath d='M5 8h5v1H5z' fill='%23808080'/%3E%3Cpath d='M5 10h3v1H5z' fill='%23808080'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [data-variant] :where([class*="iconIdle"]) svg *{display:none}
/* The sidebar rail toggle is a panel, not a rounded outline square. */
body[data-dsw-win2k] [class*="logoRow"] button svg[width="16"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 2h14v12H1z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M1 2h14v2H1z' fill='%230a246a'/%3E%3Cpath d='M9 5h5v8H9z' fill='%23d4d0c8' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] [class*="logoRow"] button svg[width="16"] *{display:none}
/* Inline file mentions and the diff tile are documents; the pane strip button
   is a win2k maximize; a card disclosure toggle is the same solid triangle. */
body[data-dsw-win2k] [class*="fileLink"] svg,body[data-dsw-win2k] [class*="_tile"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 1h6l3 3v9H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M9 1l3 3h-3z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M5 6h5v1H5z' fill='%23808080'/%3E%3Cpath d='M5 8h5v1H5z' fill='%23808080'/%3E%3Cpath d='M5 10h3v1H5z' fill='%23808080'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [class*="fileLink"] svg *,body[data-dsw-win2k] [class*="_tile"] svg *{display:none}
body[data-dsw-win2k] [class*="stripChrome"] button svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M2 2h9v9H2z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M2 2h9v2H2z' fill='%230a246a'/%3E%3Cpath d='M5 5h9v9H5z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M5 5h9v2H5z' fill='%230a246a'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] [class*="stripChrome"] button svg *{display:none}
body[data-dsw-win2k] [class*="card"] [class*="toggle"] svg{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E")}
body[data-dsw-win2k] [class*="card"] [class*="toggle"] svg *{display:none}
body[data-dsw-win2k] :where([class*="iconIdle"]) svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 1h6l3 3v9H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M9 1l3 3h-3z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M5 6h5v1H5z' fill='%23808080'/%3E%3Cpath d='M5 8h5v1H5z' fill='%23808080'/%3E%3Cpath d='M5 10h3v1H5z' fill='%23808080'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] :where([class*="iconIdle"]) svg *{display:none}
/* The Settings dialog: the Appearance cubes become the period display applet
   (white, black and split screens), the close button a bold X, the font-size
   stepper two solid arrows, and every select caret the same black triangle. */
body[data-dsw-win2k] [class*="cubeRow"] > button:nth-child(1) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAtUExURQAAAP///wAAAKCgpAD/////AMDAwGZmZgD/AMzMzIaGhvHx8dfX17Kyst3d3cAuS+8AAAABdFJOUwBA5thmAAAAAWJLR0QB/wIt3gAAAAd0SU1FB+oJEhAQM2U/vxYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNjo1MSswMDowMG0++DwAAABFSURBVAjXYxCEACEGYWMwMGIQhogYMQiLwBiiMIYghgimFJyRVpaWnlaOLAKyoNnYiGHWKjBYxMDAUH3WqoABBFa/BTEAY5gWEc6Y3LAAAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] [class*="cubeRow"] > button:nth-child(2) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAtUExURQAAAP///wAAAKCgpAD/////AMDAwGZmZgD/AMzMzIaGhvHx8dfX17Kyst3d3cAuS+8AAAABdFJOUwBA5thmAAAAAWJLR0QB/wIt3gAAAAd0SU1FB+oJEhAQM2U/vxYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNjo1MSswMDowMG0++DwAAABLSURBVAjXYxCEACEGYWMwMGIQVgIDIwZhFRhDFcZQwhDBlFKEMdLK0tLTyo0YhCFWGEGsaDY2Ypi1CgwWMTAwVJ+1KmAAgdVvQQwAgMYZPB/XED8AAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] [class*="cubeRow"] > button:nth-child(3) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAwUExURQAAAP///wAAAKCgpDNmmQD/////AMDAwGZmZgD/AMzMzIaGhvHx8dfX17Kyst3d3XhvyjkAAAABdFJOUwBA5thmAAAAAWJLR0QB/wIt3gAAAAd0SU1FB+oJEhAQM2U/vxYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNjo1MSswMDowMG0++DwAAABLSURBVAjXYxCEACEGYWMwMGIQdgEDIwZhVxjDDcZwwRDBlHKEMcrbyyvKO4wYhCFWGEGsmGxsxLB6NxhsYmBg6Lln3cAAAnv+gRgA4ckg+Wry9IkAAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] [role="dialog"] [class*="close"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 3l8 8M11 3l-8 8' fill='none' stroke='%23000000' stroke-width='2'/%3E%3C/svg%3E") center/14px 14px no-repeat}

body[data-dsw-win2k] [class*="arrows"] > button:first-child svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 9' shape-rendering='crispEdges'%3E%3Cpath d='M1 6l3.5-4L8 6z' fill='%23000000'/%3E%3C/svg%3E") center/9px 9px no-repeat}

body[data-dsw-win2k] [class*="arrows"] > button:last-child svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 9 9' shape-rendering='crispEdges'%3E%3Cpath d='M1 3l3.5 4L8 3z' fill='%23000000'/%3E%3C/svg%3E") center/9px 9px no-repeat}

body[data-dsw-win2k] [role="dialog"] [class*="selector"] svg[width="14"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E")}
/* Hero and plugins-page controls the last sweep missed. */
body[data-dsw-win2k] [data-slot="conversation.hero.agentPreset"] svg[width="16"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 3h14v11H1z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M2 4h12v3H2z' fill='%230a246a'/%3E%3Cpath d='M3 9h4v3H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M8 9h5v1H8z' fill='%23808080'/%3E%3Cpath d='M8 11h5v1H8z' fill='%23808080'/%3E%3C/svg%3E") center/16px 16px no-repeat}

body[data-dsw-win2k] [class*="seat"] svg[width="16"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 3h14v11H1z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M2 4h12v3H2z' fill='%230a246a'/%3E%3Cpath d='M3 9h4v3H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M8 9h5v1H8z' fill='%23808080'/%3E%3Cpath d='M8 11h5v1H8z' fill='%23808080'/%3E%3C/svg%3E") center/16px 16px no-repeat}

body[data-dsw-win2k] [class*="iconWrap"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Ccircle cx='6' cy='6' r='4' fill='%23ffffcc' stroke='%23000000'/%3E%3Cpath d='M9 9l4 4' fill='none' stroke='%23404040' stroke-width='2'/%3E%3C/svg%3E") center/14px 14px no-repeat}

body[data-dsw-win2k] [class*="toolbar"] button[class*="primary"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 3h8v8H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M6 4h2v6H6z' fill='%23000000'/%3E%3Cpath d='M4 6h6v2H4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}

body[data-dsw-win2k] [class*="cubeRow"] button svg *,body[data-dsw-win2k] [role="dialog"] [class*="close"] svg *,body[data-dsw-win2k] [class*="arrows"] button svg *,body[data-dsw-win2k] [role="dialog"] [class*="selector"] svg[width="14"] *,body[data-dsw-win2k] [data-slot="conversation.hero.agentPreset"] svg[width="16"] *,body[data-dsw-win2k] [class*="seat"] svg[width="16"] *,body[data-dsw-win2k] [class*="iconWrap"] svg *,body[data-dsw-win2k] [class*="toolbar"] button[class*="primary"] svg *{display:none}
/* The Settings rail, in registration order: General, Models, Built-in plugins,
   Agent presets, Archived sessions. A profile that registers another section
   shifts a label, not the layout; each row keeps its own text. */
body[data-dsw-win2k] [role="dialog"] [class*="navList"] > button:nth-child(1) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAtUExURQAAAMDAwICAgAAAgP///wAA/wCAgAD//4AAgACAAP8AAP8A/wAAAP//AICAAPkGuLMAAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAd0SU1FB+oJEhAQM2U/vxYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNjo1MSswMDowMG0++DwAAABxSURBVAjXY2CAAUEQEGJgYBA2NjYGM4SUQICBgUEkxK3EwwnEMPGc4gVmuHhscfEBMa54Pzmic4SBQaTE/YiLjh9Isd8TF50jBxgEBeWe+JzxecNw5sy5I+d8XN6AbHnzzu/dATCD78E5iMU8BxgQAACmciEQKni3EQAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] [role="dialog"] [class*="navList"] > button:nth-child(2) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAYUExURQAAAICAgMDAwP///wAAAAAA/wAAgAD/AOa1tgIAAAABdFJOUwBA5thmAAAAAWJLR0QDEQxM8gAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABcSURBVAjXdYzBDYAgEASXxAIErgE2Jr7RBtCcdkADPui/BHPg13nNY3cA5w0AgSRzgdsNX+A2VT27XLU+P3K3NsTuJr0nMyY1DkHswSyI5KKaBHElGZLAD8o3VrzW3xS4nIteGAAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] [role="dialog"] [class*="navList"] > button:nth-child(3) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAASUExURQAAAMDAwAAAAAAAv4CAgP///y/2NeEAAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAd0SU1FB+oJEhAQM2U/vxYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNjo1MSswMDowMG0++DwAAAAvSURBVAjXY2CAAUEIEGIQNjY2NhYSVIIwlJSUGERcwECIQTQUDKjHgBjs4gR3BQCa8hoc7SMe/AAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] [role="dialog"] [class*="navList"] > button:nth-child(4) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAA/UExURQAAAAAAAIaGhsDAwPHx8fj4+P///+Pj4+rq6t3d3dfX13d3dwD/AGaZAMzMzP8AAMwAM5aWlpmZmaCgpLKysvqoa9IAAAABdFJOUwBA5thmAAAAAWJLR0QGYWa4fQAAAAd0SU1FB+oJEhAQM2U/vxYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNjo1MSswMDowMG0++DwAAACMSURBVBjTRY9RDsMwCEOxHdombGxtdv+zTkk29Qu9JxuBGQCYmZEcY7JgxlJ8KgjaYNyP4l4Bw6YNYKvHUSpmZQMQUt0nryWtMSQowoxe6+OZ2YJDwOjurb3emSI5heSemedJrkSm5FcfPBPRhunXSMybGZE5BIGYh0gR2TvAWF8BH8WNS+nXt1v98QtsmAS7SO/8kAAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] [role="dialog"] [class*="navList"] > button:nth-child(5) svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAA8UExURQQEBJmZAAQEBP//////zP//mczMZjMzAJaWlk1NTf/MmXd3d0JCQjk5OZlmMzMzM8yZM4aGhvHx8cDAwJI1V/MAAAABdFJOUwBA5thmAAAAAWJLR0QDEQxM8gAAAAd0SU1FB+oJEhAcERzqsf4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6Mjc6MzErMDA6MDD7OWXnAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjI3OjMxKzAwOjAwimTdWwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyODoxNyswMDowMA2PlU4AAABoSURBVBjThcpBEoMwDENRB1vBNgWHcP+7dtICgWHB2+mPiJ5SM1w2iwC9pPz3+6UWpEMeWwCgqjDAj6AysX3gx0OFxeYlzodOwvNS4nyswnUrpT9g1eoW8D24e0SE+x7y1UhEww29+wIjowRWuykdYwAAAABJRU5ErkJggg==") center/contain no-repeat}

body[data-dsw-win2k] [role="dialog"] [class*="navList"] > button:nth-child(-n+5) svg *{display:none}
/* The Plugins page: every card wears the same fallback glyph, so it gets the
   period package box; the hero workspace chip gets a folder. */
body[data-dsw-win2k] [class*="cardIcon"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUBAMAAAB/pwA+AAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAASUExURQAAAICAgAAAAAAAv8DAwP///9WGIt4AAAABdFJOUwBA5thmAAAAAWJLR0QF+G/pxwAAAAd0SU1FB+oJEhAQM2U/vxYAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6MTY6MDQrMDA6MDBRrkCcAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjE2OjA0KzAwOjAwIPP4IAAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoxNjo1MSswMDowMG0++DwAAAAySURBVAjXY2BAAEEYEGIQNoYCIyjTREVFCco0UlJSYhBxgQInBsFQKKA3E9kNCKcjAAADtixDDO65TAAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] [class*="cardIcon"] svg *{display:none}
body[data-dsw-win2k] [class*="heroWorkspaceRow"] button[class*="workspace"] svg[width="16"]{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAYUExURQAAAJmZAAAAAPHx8f//zP//mczMZv/MmXuLEm8AAAABdFJOUwBA5thmAAAAB3RJTUUH6gkSDzoMq0i6TgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMO0OWscAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDCcU+J7AAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwy0bDpAAAAFRJREFUCNdjYIADQUEhMM1o4hqoAGKIpaWlCQoKMjCIuIBAmAKDSCgIlEEY4eEwkVKISDhcpBQiEh4eHg5ilJaWlpaXKYANTEtLU2BgUgIDBQYMAADGRBkaGGPFHgAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] [class*="heroWorkspaceRow"] button[class*="workspace"] svg[width="16"] *{display:none}
body[data-dsw-win2k] [class*="heroWorkspaceRow"] button svg[width="12"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E") center/12px 12px no-repeat}
body[data-dsw-win2k] [class*="heroWorkspaceRow"] button svg[width="12"] *{display:none}
/* Section collapse toggles, the sidebar search field, the view switcher and a
   to-do card lead: the last of the page own glyphs. */
body[data-dsw-win2k] [class*="groupToggle"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E") center/12px 12px no-repeat}
body[data-dsw-win2k] [class*="groupToggle"] svg *{display:none}
body[data-dsw-win2k] label[class*="search"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOBAMAAADtZjDiAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAbUExURQAAAICAgP///wAAAMDAwAD//wCAgAAA/wAAgPqrAR4AAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEhAfNQvEBuwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjozMTo1MyswMDowMEARS60AAABVSURBVAjXY2AQFBQUZGBgYBBSUlKE0QIMDAzCLkpKzgwMjComTiBaSNUZTIuqBEP4oc4uYHkXExMnZ5B6oXQXEC3i0poO5htbhBkzgEGrAYRmZmAAAIwMDFMFm2KCAAAAAElFTkSuQmCC") center/contain no-repeat}
body[data-dsw-win2k] label[class*="search"] svg *{display:none}
body[data-dsw-win2k] [class*="switcher"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M1 1h12v12H1z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M1 2h12v2H1z' fill='%230a246a'/%3E%3Cpath d='M3 6h8v1H3z' fill='%23404040'/%3E%3Cpath d='M3 8h8v1H3z' fill='%23404040'/%3E%3Cpath d='M3 10h5v1H3z' fill='%23404040'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [class*="switcher"] svg *{display:none}
body[data-dsw-win2k] [class*="headerActions"] svg[width="14"]{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E")}
body[data-dsw-win2k] [class*="headerActions"] svg[width="14"] *{display:none}
body[data-dsw-win2k] span[class*="lead"] svg{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAACYktHRAD/h4/MvwAAAAd0SU1FB+oJEg86DKtIuk4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMMtGw6QAAABRSURBVCjPzZBRCsAgDENfxYN7NU8WP9bhlFr8XCAUSpqEAoACOgog0TZ+JE0SIadDkNCXiBT1GeZdbW04Be9SuUMkqqfLPzncPKqnAjv6e60BG7k3AxLMYUkAAAAASUVORK5CYII=") center/contain no-repeat}
body[data-dsw-win2k] span[class*="lead"] svg *{display:none}
/* Right-hand pane chrome (new tab, split) and the trajectory table filter. */
body[data-dsw-win2k] [class*="tabStrip"] button[class*="addTab"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M3 1h6l3 3v9H3z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M9 1l3 3h-3z' fill='%23d4d0c8' stroke='%23000000'/%3E%3Cpath d='M6 6h2v6H6z' fill='%23000000'/%3E%3Cpath d='M4 8h6v2H4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [class*="tabStrip"] button[class*="addTab"] svg *{display:none}
body[data-dsw-win2k] [class*="tabStrip"] button[class*="iconButton"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M1 2h14v12H1z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M1 2h14v2H1z' fill='%230a246a'/%3E%3Cpath d='M9 5h5v8H9z' fill='%23d4d0c8' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] [class*="tabStrip"] button[class*="iconButton"] svg *{display:none}
body[data-dsw-win2k] svg[width="11"][class*="search"],body[data-dsw-win2k] [class*="inner"] svg[width="11"]{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAsAAAALBAMAAABbgmoVAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAbUExURQAAAICAgP///8DAwAAAAAD//wAA/wCAgAAAgOv0IMQAAAABdFJOUwBA5thmAAAAAWJLR0QCZgt8ZAAAAAd0SU1FB+oJEhAfNQvEBuwAAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDDtDlrHAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwnFPiewAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjozMTo1MyswMDowMEARS60AAABHSURBVAjXFcXRDUBQDEDRWwygEgMoMcDrMwD6YYCX2MT80vNzEFUFxGwZQYptAV0rVmFar2z2O+ublwpy7p758WXxvEEa4Ace5wfywDiZPAAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] [class*="inner"] svg[width="11"] *{display:none}
body[data-dsw-win2k] [class*="actions"] svg[class*="toggle"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E") center/11px 11px no-repeat}
body[data-dsw-win2k] [class*="actions"] svg[class*="toggle"] *{display:none}
/* A submenu caret is the black right triangle a win2k menu used; only the last
   child svg of a menu cell matches, so a leading item icon is never touched. */
body[data-dsw-win2k] [role="menuitem"] > svg:last-child{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M5 4l4 3-4 3z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] [role="menuitem"] > svg:last-child *{display:none}
/* The per-message actions are icon-only buttons that share one class, so the
   only handle is the accessible name. Both locales the client ships are
   matched; an action in a third locale keeps its own glyph rather than
   getting the wrong bitmap. */
body[data-dsw-win2k] button[aria-label="Copy"]:has(svg),body[data-dsw-win2k] button[aria-label="Copied"]:has(svg),body[data-dsw-win2k] button[aria-label="复制"]:has(svg),body[data-dsw-win2k] button[aria-label="复制成功"]:has(svg){background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M2 1h8l3 3v6H2z' fill='%23c0c0c0' stroke='%23000000'/%3E%3Cpath d='M5 5h8l3 3v6H5z' fill='%23ffffff' stroke='%23000000'/%3E%3Cpath d='M13 5l3 3h-3z' fill='%23d4d0c8' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}
body[data-dsw-win2k] button[aria-label="Copied"]:has(svg),body[data-dsw-win2k] button[aria-label="复制成功"]:has(svg){background-image:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQAgMAAABinRfyAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAMUExURQAAAAAAAACAAP///4SxoRYAAAABdFJOUwBA5thmAAAAAWJLR0QDEQxM8gAAAAd0SU1FB+oJEhAcERzqsf4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6Mjc6MzErMDA6MDD7OWXnAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjI3OjMxKzAwOjAwimTdWwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyODoxNyswMDowMA2PlU4AAAA/SURBVAjXY2BAANEABgbGrKUMDGyrVjkwsK3a58AgtWrfBAapVb9gxO9XExik9r+awMC2HqxklQNEB1gvCAAACqEU/Ew/cyQAAAAASUVORK5CYII=")}

body[data-dsw-win2k] button[aria-label="Branch into a new conversation"]:has(svg),body[data-dsw-win2k] button[aria-label="在新对话中分支"]:has(svg){background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M3 2h4v4H3z' fill='%23000000'/%3E%3Cpath d='M3 11h4v4H3z' fill='%23000000'/%3E%3Cpath d='M10 2h4v4h-4z' fill='%23000000'/%3E%3Cpath d='M4 5h2v7H4z' fill='%23000000'/%3E%3Cpath d='M6 9h2v2H6zM8 7h2v2H8zM10 5h2v2h-2z' fill='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}

body[data-dsw-win2k] button[aria-label="Good response"]:has(svg),body[data-dsw-win2k] button[aria-label="好的回答"]:has(svg){background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M8 3l6 8H2z' fill='%23008000' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}

body[data-dsw-win2k] button[aria-label="Bad response"]:has(svg),body[data-dsw-win2k] button[aria-label="有问题的回答"]:has(svg){background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' shape-rendering='crispEdges'%3E%3Cpath d='M8 12L2 4h12z' fill='%23c00000' stroke='%23000000'/%3E%3C/svg%3E") center/16px 16px no-repeat}

body[data-dsw-win2k] button[aria-label="Remove rating"]:has(svg),body[data-dsw-win2k] button[aria-label="取消标记"]:has(svg){background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAPUExURQAAAIAAAP8AAAAAAP///2Y4ojQAAAABdFJOUwBA5thmAAAAAWJLR0QEj2jZUQAAAAd0SU1FB+oJEhAcERzqsf4AAAAldEVYdGRhdGU6Y3JlYXRlADIwMjYtMDktMThUMTY6Mjc6MzErMDA6MDD7OWXnAAAAJXRFWHRkYXRlOm1vZGlmeQAyMDI2LTA5LTE4VDE2OjI3OjMxKzAwOjAwimTdWwAAACh0RVh0ZGF0ZTp0aW1lc3RhbXAAMjAyNi0wOS0xOFQxNjoyODoxNyswMDowMA2PlU4AAAA/SURBVAjXY2DAAhgFBSG0kJKSMIghpKSkpGSAxGAE0UrKIIaLi4sTKgMuBWUgtBvBGMxGSkrGYDuYjY2RrQYAh7QJ/doG9HEAAAAASUVORK5CYII=") center/contain no-repeat}

body[data-dsw-win2k] button[aria-label="Copy"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="Copied"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="复制"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="复制成功"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="Branch into a new conversation"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="在新对话中分支"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="Good response"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="好的回答"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="Bad response"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="有问题的回答"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="Remove rating"]:has(svg) svg *,body[data-dsw-win2k] button[aria-label="取消标记"]:has(svg) svg *{display:none}
/* The caption chips and the app picker end in the same black triangle a win2k
   combo box does. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) button[aria-expanded] svg[width="14"]{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14' shape-rendering='crispEdges'%3E%3Cpath d='M4 6h6l-3 4z' fill='%23000000'/%3E%3C/svg%3E") center/14px 14px no-repeat}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) button[aria-expanded] svg[width="14"] *{display:none}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) [class*="_chevron"] svg{background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 11 11' shape-rendering='crispEdges'%3E%3Cpath d='M2 4h7l-3.5 4z' fill='%23000000'/%3E%3C/svg%3E") center/11px 11px no-repeat}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) [class*="_chevron"] svg *{display:none}
/* The metric pills are this page status bar. Win2k status panes are flat text
   with an etched separator, not icons on raised plates. */
body[data-dsw-win2k] [class*="q_actions"] button[class*="trigger"]{background-color:transparent;box-shadow:none;border-radius:0;color:#000000}
body[data-dsw-win2k] [class*="q_actions"] button[class*="trigger"] svg{display:none}
body[data-dsw-win2k] [class*="q_actions"] > span + span{border-left:1px solid #808080;margin-left:2px;padding-left:6px}
/* The caption app button opens the workspace where Files would: a folder. */
body[data-dsw-win2k] header:has([data-conversation-header-leading]) button svg[width="15"]{background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQBAMAAADt3eJSAAAAIGNIUk0AAHomAACAhAAA+gAAAIDoAAB1MAAA6mAAADqYAAAXcJy6UTwAAAAYUExURQAAAJmZAAAAAPHx8f//zP//mczMZv/MmXuLEm8AAAABdFJOUwBA5thmAAAAB3RJTUUH6gkSDzoMq0i6TgAAACV0RVh0ZGF0ZTpjcmVhdGUAMjAyNi0wOS0xOFQxNTo1ODoxMiswMDowMO0OWscAAAAldEVYdGRhdGU6bW9kaWZ5ADIwMjYtMDktMThUMTU6NTg6MTIrMDA6MDCcU+J7AAAAKHRFWHRkYXRlOnRpbWVzdGFtcAAyMDI2LTA5LTE4VDE1OjU4OjEyKzAwOjAwy0bDpAAAAFRJREFUCNdjYIADQUEhMM1o4hqoAGKIpaWlCQoKMjCIuIBAmAKDSCgIlEEY4eEwkVKISDhcpBQiEh4eHg5ilJaWlpaXKYANTEtLU2BgUgIDBQYMAADGRBkaGGPFHgAAAABJRU5ErkJggg==") center/contain no-repeat}
body[data-dsw-win2k] header:has([data-conversation-header-leading]) button svg[width="15"] *{display:none}
/* The composer dock row is the status bar proper: pane text, no glyph, a sunken
   separator between panes. */
body[data-dsw-win2k] [class*="_dock"] button[class*="pill"],body[data-dsw-win2k] [class*="_dock"] button[class*="trigger"]{background-color:transparent;box-shadow:none;border-radius:0;color:#000000}
body[data-dsw-win2k] [class*="_dock"] button[class*="pill"] svg,body[data-dsw-win2k] [class*="_dock"] button[class*="trigger"] svg{display:none}
body[data-dsw-win2k] [class*="_dock"]{background-color:#d4d0c8}
body[data-dsw-win2k] [class*="_dock"] [class*="anchor"] + [class*="anchor"]{border-left:1px solid #808080;margin-left:4px;padding-left:8px}
body[data-dsw-win2k] [class*="_dock"] > [class*="root"] + [class*="root"]{border-left:1px solid #808080;margin-left:4px;padding-left:8px}
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
      // registration does not depend on plugin load order. ui-theme owns 10
      // (Appearance) and 11 (Font size) and ui-chat owns 12 (Conversation
      // display), so 11.5 is the only value that keeps the cube directly under
      // the Appearance row instead of tying with a row whose registration order
      // varies with module timing.
      ctx.slots.inject('settings.general.item', () => ctx.slots.register({
        name: 'settings.general.item',
        id: 'win2k-theme',
        order: 11.5,
      }, Row))
    }

    exports.apply = apply
    exports.inject = ['slots', 'settingsScope', 'theme', 'locale']
    return module.exports
  },
})
