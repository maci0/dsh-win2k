/**
 * dsh-win2k — Windows 2000 theme, as a DeepSeek Harness plugin.
 *
 * One theme, registered through the public `ctx.theme` extension point, plus
 * the chrome a token cannot express. The Appearance row in Settings → General
 * lists every registered theme, so `Windows 2000` appears there as a fourth
 * cube and the choice persists in the `ui-theme` settings namespace.
 *
 * The palette is the Windows 2000 registry colour set (`HKCU\Control
 * Panel\Colors`: ButtonFace #d4d0c8, ActiveTitle #0a246a, Window #ffffff,
 * GrayText #808080, ButtonDkShadow #404040, InfoWindow #ffffe1) mapped onto the
 * `--dsw-alias-*` tokens, taken from the win2k theme the author's other
 * projects ship (clanker `themes/win2k.json`).
 *
 * Chrome is a stylesheet, not inline style objects: the module system claims
 * every `<style>` tag a factory appends while it materializes and removes it
 * when the package unloads, so the tag costs nothing to own. Every rule is
 * scoped under `body[data-dsw-win2k]`, an attribute this half toggles from the
 * theme snapshot, so the sheet stays inert while another theme is selected.
 * It is appended after ui-theme's sheets (this package injects
 * `dsh-client-ui-theme`), which is what lets an unbumped
 * `::-webkit-scrollbar-thumb` rule win.
 *
 * This file is plain JavaScript on purpose. The client module system serves a
 * package's `exports["./client"]` artifact as a lazy-CJS factory registered on
 * `window.__ModuleLoader__`, and that is the whole format — an out-of-tree
 * plugin can author it directly instead of reproducing the repository's tsdown
 * client preset.
 *
 * Deliberately not carried over from the reference sheets: the win2k cursors
 * (`%SystemRoot%\cursors` as SVG data URLs — twelve rules of string noise for a
 * pointer most users never notice), the title-bar gradient and taskbar/Start
 * menu chrome (markup this page does not have), per-component metrics, and a
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

    /** Registered theme id — what `ctx.theme.setTheme` selects. */
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

      /* Edges: ButtonShadow #808080 outside ButtonDkShadow #404040. */
      '--dsw-alias-border-l1': '#808080',
      '--dsw-alias-border-l2': '#808080',
      '--dsw-alias-border-l3': '#404040',
      '--dsw-alias-border-l4': '#404040',

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
      /* The active row keeps dark ink, so the highlight stays pale. */
      '--dsw-specific-sidebar-nav-item-active': '#cfe0f8',
      '--dsw-specific-sidebar-nav-item-active-accent': '#a6caf0',
      '--dsw-specific-sidebar-nav-item-hover': '#c9c5bd',
      '--dsw-specific-tip': '#ffffe1',

      /* 1999's faces. Body text was 11px MS Sans Serif; the type scale keeps
         the client's own sizes and only takes the family. */
      '--dsw-font-family': '"MS Sans Serif", "Microsoft Sans Serif", Tahoma, Verdana, sans-serif',
      '--ds-font-family-code': '"Lucida Console", "Courier New", monospace',
    }

    /** Chrome the token layer cannot express, scoped to the active theme. */
    const CSS = [
      /* Square corners everywhere the base sheet rounds one, including the
         capsules and circles it pairs with `corner-shape: round`. */
      'body[data-dsw-win2k]{--dsw-corner-shape:square}',
      /* Selection is the period's navy wash. */
      'body[data-dsw-win2k] ::selection{background:#0a246a;color:#ffffff}',
      /* Menus and dialogs drop the hairline-and-glow for a black frame and a
         1px-offset hard shadow — win2k never blurred a shadow. */
      'body[data-dsw-win2k],body[data-dsw-win2k] *{--dsw-elevation-stroke-color:#404040;'
        + '--dsw-elevation-panel:0 0 0 1px #404040,2px 2px 3px rgba(0,0,0,.35);'
        + '--dsw-elevation-prominent:0 0 0 1px #404040,2px 2px 4px rgba(0,0,0,.4);'
        + '--dsw-elevation-soft:0 0 0 1px #808080,2px 2px 3px rgba(0,0,0,.3)}',
      /* The 16px scrollbar: dithered track, raised thumb, square ends. */
      'body[data-dsw-win2k]{--dsh-scrollbar-width:16px;--dsh-scrollbar-thumb-border:0px}',
      'body[data-dsw-win2k] ::-webkit-scrollbar-track{'
        + 'background:repeating-conic-gradient(#ffffff 0% 25%,#d4d0c8 0% 50%) 0 0/2px 2px;'
        + 'box-shadow:inset 1px 1px 0 #404040,inset -1px -1px 0 #ffffff}',
      'body[data-dsw-win2k] ::-webkit-scrollbar-thumb{border-radius:0;border:1px solid #808080;'
        + 'background:#d4d0c8;background-clip:border-box;'
        + 'box-shadow:inset 1px 1px 0 #ffffff,inset -1px -1px 0 #404040}',
      'body[data-dsw-win2k] ::-webkit-scrollbar-thumb:hover{background-color:#c0bdb6}',
      'body[data-dsw-win2k] ::-webkit-scrollbar-corner{background:#d4d0c8}',
      /* Firefox takes the standard path (the two are mutually exclusive in the
         base sheet); it gets a grey thumb on a white track and no dither. */
      '@supports not selector(::-webkit-scrollbar){body[data-dsw-win2k],body[data-dsw-win2k] *{'
        + 'scrollbar-width:auto;scrollbar-color:#d4d0c8 #ffffff}}',
    ].join('')

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
     * Mark the document while this theme is the active one, so the chrome
     * sheet is inert under light/dark/system and the next theme swap needs no
     * re-injection. The token layer itself needs no help: the presenter writes
     * `--dsw-*` from the snapshot.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      ctx.effect(
        () => ctx.theme.register({ id: THEME_ID, label: 'Windows 2000', colorScheme: 'light', tokens: TOKENS }),
        'dsh-win2k: theme registration',
      )

      const mark = (snapshot) => {
        if (typeof document === 'undefined') return
        document.body.toggleAttribute(ACTIVE_ATTRIBUTE, snapshot.active.id === THEME_ID)
      }
      ctx.on('theme/change', mark)
      ctx.effect(() => () => {
        if (typeof document !== 'undefined') document.body.removeAttribute(ACTIVE_ATTRIBUTE)
      }, 'dsh-win2k: chrome scope')
      mark(ctx.theme.getTheme())
    }

    exports.apply = apply
    exports.inject = ['theme']
    return module.exports
  },
})
