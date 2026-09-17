/**
 * dsh-win2k — browser half.
 *
 * Two surfaces, one setting:
 *
 * - a `ctx.theme` registration that repaints the Web client in the Windows
 *   2000 palette, forced on while the `win2k` settings namespace says
 *   `enabled`; and
 * - the card in Settings → Plugins → Plugin configuration that flips that
 *   value, keyed on the namespace the host half registers.
 *
 * The palette is the Windows 2000 registry colour set (`HKCU\Control
 * Panel\Colors`: ButtonFace #d4d0c8, ActiveTitle #0a246a, Window #ffffff,
 * GrayText #808080, InfoWindow #ffffe1) mapped onto the `--dsw-alias-*`
 * tokens, taken from the win2k theme the author's other projects ship
 * (clanker `themes/win2k.json`). The sheet at the bottom carries the part a
 * token cannot spell: square corners, the 1999 sans-serif face, and the
 * beveled scrollbar.
 *
 * Chrome is a stylesheet, not inline style objects: the module system claims
 * every `<style>` tag a factory appends while it materializes and removes it
 * when the package unloads, so the tag costs nothing to own. It is appended
 * after ui-theme's sheets (this package injects `dsh-client-ui-theme`), which
 * is what lets an unbumped `::-webkit-scrollbar-thumb` rule win.
 *
 * This file is plain JavaScript on purpose. The client module system serves a
 * package's `exports["./client"]` artifact as a lazy-CJS factory registered on
 * `window.__ModuleLoader__`, and that is the whole format — an out-of-tree
 * plugin can author it directly instead of reproducing the repository's tsdown
 * client preset.
 *
 * Deliberately not carried over from the reference sheets: the win2k cursors
 * (`%SystemRoot%\cursors` as SVG data URLs — 12 rules of string noise for a
 * pointer most users never notice), the title-bar gradient and taskbar/Start
 * menu chrome (markup this page does not have), and per-component metrics.
 * Corners go square through `--dsw-corner-shape`, which also squares the
 * capsules and circles the base sheet rounds; that is the period look, and it
 * is one line instead of a class-by-class override list.
 */

window.__ModuleLoader__.load({
  id: 'dsh-win2k',

  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')

    /** Settings namespace shared with the host half; also this card's slot key. */
    const NAMESPACE = 'win2k'

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

    /** Chrome the token layer cannot express. */
    const CSS = [
      /* Square corners everywhere the base sheet rounds one, including the
         capsules and circles it pairs with `corner-shape: round`. */
      'body{--dsw-corner-shape:square}',
      /* Selection is the period's navy wash. */
      '::selection{background:#0a246a;color:#ffffff}',
      /* Menus and dialogs drop the hairline-and-glow for a black frame and a
         1px-offset hard shadow — win2k never blurred a shadow. */
      'body,body *{--dsw-elevation-stroke-color:#404040;'
        + '--dsw-elevation-panel:0 0 0 1px #404040,2px 2px 3px rgba(0,0,0,.35);'
        + '--dsw-elevation-prominent:0 0 0 1px #404040,2px 2px 4px rgba(0,0,0,.4);'
        + '--dsw-elevation-soft:0 0 0 1px #808080,2px 2px 3px rgba(0,0,0,.3)}',
      /* The 16px scrollbar: dithered track, raised thumb, square ends. */
      'body{--dsh-scrollbar-width:16px;--dsh-scrollbar-thumb-border:0px}',
      '::-webkit-scrollbar-track{background:repeating-conic-gradient(#ffffff 0% 25%,#d4d0c8 0% 50%) 0 0/2px 2px;'
        + 'box-shadow:inset 1px 1px 0 #404040,inset -1px -1px 0 #ffffff}',
      '::-webkit-scrollbar-thumb{border-radius:0;border:1px solid #808080;background:#d4d0c8;background-clip:border-box;'
        + 'box-shadow:inset 1px 1px 0 #ffffff,inset -1px -1px 0 #404040}',
      '::-webkit-scrollbar-thumb:hover{background-color:#c0bdb6}',
      '::-webkit-scrollbar-corner{background:#d4d0c8}',
      /* Firefox takes the standard path (the two are mutually exclusive in the
         base sheet); it gets a grey thumb on a white track and no dither. */
      '@supports not selector(::-webkit-scrollbar){body,body *{scrollbar-width:auto;'
        + 'scrollbar-color:#d4d0c8 #ffffff}}',
      /* Card chrome, `dw-`-prefixed: the sheet lands in the page's own document. */
      '.dw-card{list-style:none;border:1px solid #808080;background:#d4d0c8;color:#000000;'
        + 'box-shadow:inset 1px 1px 0 #ffffff,inset -1px -1px 0 #404040}',
      '.dw-header{width:100%;appearance:none;border:0;background:none;font:inherit;color:inherit;text-align:left;'
        + 'cursor:pointer;display:flex;align-items:center;gap:12px;padding:12px 14px}',
      '.dw-head{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}',
      '.dw-name{font-size:14px;font-weight:700;line-height:1.4}',
      '.dw-desc{font-size:12px;line-height:1.5;color:#404040}',
      '.dw-chevron{flex:none;width:7px;height:7px;margin-top:-3px;border-right:1.5px solid #404040;'
        + 'border-bottom:1.5px solid #404040;transition:transform .16s;transform:rotate(45deg)}',
      '.dw-chevron-open{transform:rotate(225deg);margin-top:3px}',
      '.dw-body{border-top:1px solid #808080;box-shadow:inset 0 1px 0 #ffffff;margin:0 14px;'
        + 'padding:12px 0 10px;display:flex;flex-direction:column;gap:10px}',
      '.dw-row{display:flex;flex-wrap:wrap;gap:0}',
      '.dw-push{appearance:none;font:inherit;font-size:12px;line-height:20px;min-width:88px;padding:1px 10px;'
        + 'cursor:pointer;color:#000000;background:#d4d0c8;border:1px solid;'
        + 'border-color:#ffffff #404040 #404040 #ffffff;box-shadow:inset -1px -1px 0 #808080,inset 1px 1px 0 #d4d0c8}',
      '.dw-push-selected{outline:1px dotted #000000;outline-offset:-4px;font-weight:700}',
      '.dw-push:active:not(:disabled){border-color:#404040 #ffffff #ffffff #404040;'
        + 'box-shadow:inset 1px 1px 0 #808080;padding:2px 9px 0 11px}',
      '.dw-push:disabled{cursor:default;color:#808080;text-shadow:1px 1px 0 #ffffff}',
      '.dw-hint{font-size:12px;line-height:1.5;color:#404040}',
      '.dw-error{font-size:12px;line-height:1.5;color:#a40000}',
    ].join('')

    // Appended while the factory materializes: the module system claims the tag
    // for this package and disposes it on unload. Guarded because the node unit
    // tests evaluate this file without a DOM.
    if (typeof document !== 'undefined') {
      const style = document.createElement('style')
      style.textContent = CSS
      document.head.append(style)
    }

    /** Plugin version, shown in the card header. Bump with package.json. */
    const VERSION = '0.1.0'

    /**
     * Bind one scope to a React subscription.
     * @param scope - a scope bound to the win2k settings namespace.
     * @returns a hook reading that scope's current snapshot.
     */
    function useScope(scope) {
      const subscribe = (listener) => scope.subscribe(listener)
      const getSnapshot = () => scope.getSnapshot()
      return () => React.useSyncExternalStore(subscribe, getSnapshot)
    }

    /**
     * Read a snapshot's `enabled` flag. The default is on: a deployment that
     * serves the namespace but holds no value still gets the theme.
     * @param snapshot - the settings scope snapshot.
     * @returns whether the theme is on, or `undefined` when unreadable.
     */
    function enabledOf(snapshot) {
      if (snapshot.status !== 'ready') return undefined
      const value = snapshot.value !== null && typeof snapshot.value === 'object' ? snapshot.value : {}
      return value.enabled !== false
    }

    /**
     * Build the card component over one bound settings scope.
     * @param scope - the scope bound to the win2k namespace.
     * @param theme - the ctx.theme service, read for the active theme id.
     * @param useThemeSnapshot - hook over `theme/change`.
     * @returns the component the slot renders.
     */
    function createCard(scope, theme, useThemeSnapshot) {
      const useWin2k = useScope(scope)

      return function Win2kCard() {
        const snapshot = useWin2k()
        const [open, setOpen] = React.useState(false)
        const [error, setError] = React.useState(null)
        const themeSnapshot = useThemeSnapshot()
        const enabled = enabledOf(snapshot)

        // A namespace this deployment does not serve renders no trace of
        // itself. Every hook above this line runs on every render, so the
        // early return cannot reorder them.
        if (enabled === undefined) return null

        const selected = enabled
        const overridden = themeSnapshot.active.id !== THEME_ID
        const disabled = !snapshot.writable

        const write = (run) => {
          setError(null)
          Promise.resolve(run()).catch((cause) => {
            setError(cause instanceof Error ? cause.message : String(cause))
          })
        }

        return React.createElement(
          'li',
          { className: 'dw-card' },
          React.createElement(
            'button',
            {
              type: 'button',
              className: 'dw-header',
              'aria-expanded': open,
              'aria-label': `${open ? 'Collapse' : 'Expand'}: Windows 2000 theme v${VERSION}`,
              onClick: () => { setOpen(!open) },
            },
            React.createElement(
              'span',
              { className: 'dw-head' },
              React.createElement('span', { className: 'dw-name' }, `Windows 2000 theme v${VERSION}`),
              React.createElement(
                'span',
                { className: 'dw-desc' },
                selected ? 'Applied: grey face, navy selection, square corners.' : 'Off.',
              ),
            ),
            React.createElement('span', {
              className: open ? 'dw-chevron dw-chevron-open' : 'dw-chevron',
              'aria-hidden': true,
            }),
          ),
          open
            ? React.createElement(
              'div',
              { className: 'dw-body' },
              React.createElement(
                'div',
                { className: 'dw-row', role: 'radiogroup', 'aria-label': 'Windows 2000 theme' },
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    role: 'radio',
                    'aria-checked': selected,
                    disabled,
                    className: `dw-push${selected ? ' dw-push-selected' : ''}`,
                    onClick: () => { write(() => scope.set('enabled', true)) },
                  },
                  'On',
                ),
                React.createElement(
                  'button',
                  {
                    type: 'button',
                    role: 'radio',
                    'aria-checked': !selected,
                    disabled,
                    className: `dw-push${selected ? '' : ' dw-push-selected'}`,
                    onClick: () => { write(() => scope.set('enabled', false)) },
                  },
                  'Off',
                ),
              ),
              React.createElement(
                'div',
                { className: 'dw-hint' },
                overridden
                  ? 'Another theme is active — the Appearance row selects it. Switching it off here or picking Windows 2000 there settles the difference.'
                  : 'Forced while on, and it wins over the Appearance row until switched off.',
              ),
              React.createElement(
                'div',
                { className: 'dw-hint' },
                snapshot.writable ? 'Saved in your settings.' : 'Read-only: settings are not persisted in this deployment.',
              ),
              error === null ? null : React.createElement('div', { className: 'dw-error' }, error),
            )
            : null,
        )
      }
    }

    /**
     * Mount both browser surfaces: the theme registration with its applier,
     * and the Plugins card that flips it.
     * @param ctx - the browser plugin context.
     */
    function apply(ctx) {
      const theme = ctx.theme

      // One theme for the life of the package; the disposer unregisters it and
      // resets the preference if it was the active one.
      ctx.effect(
        () => theme.register({ id: THEME_ID, colorScheme: 'light', tokens: TOKENS }),
        'dsh-win2k: theme registration',
      )

      const scope = ctx.settingsScope.bind({ namespace: NAMESPACE })

      /** Preference to restore when the theme is switched off. */
      let previous = 'system'
      /** Whether this plugin is the one that moved the preference to win2k. */
      let forced = false

      // The preference the user picked in Appearance is not writable to a
      // third-party id (the durable schema accepts only light/dark/system), so
      // the applier re-forces win2k from here on every settings or theme change.
      const sync = () => {
        const enabled = enabledOf(scope.getSnapshot())
        const current = theme.getTheme().preference
        if (enabled !== false) {
          if (current === THEME_ID) return
          if (!forced) {
            previous = current
            forced = true
          }
          theme.setTheme(THEME_ID)
          return
        }
        if (current !== THEME_ID) {
          forced = false
          return
        }
        forced = false
        theme.setTheme(previous)
      }

      ctx.effect(() => scope.subscribe(sync), 'dsh-win2k: settings subscription')
      ctx.effect(() => ctx.on('theme/change', sync), 'dsh-win2k: theme subscription')
      sync()

      const useThemeSnapshot = () => React.useSyncExternalStore(
        (listener) => ctx.on('theme/change', listener),
        () => theme.getTheme(),
      )
      const Card = createCard(scope, theme, useThemeSnapshot)

      // The owner declares the slot; injecting waits for it to exist, so this
      // registration does not depend on plugin load order.
      ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
        name: 'settings.plugin.item',
        key: NAMESPACE,
      }, Card))
    }

    exports.apply = apply
    exports.inject = ['slots', 'settingsScope', 'theme']
    return module.exports
  },
})
