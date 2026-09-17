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

    /** Every class is `dw-`-prefixed: the sheet lands in the page's own document. */
    /* Chrome the token layer cannot express, scoped to the active theme. */
    /* Selection is the period's navy wash. */
    /* Menus and dialogs drop the hairline-and-glow for a black frame and a
       1px-offset hard shadow — win2k never blurred a shadow. */
    /* The 16px scrollbar: dithered track, raised thumb, square ends. */
    /* Firefox takes the standard path (the two are mutually exclusive in the
       base sheet); it gets a grey thumb on a white track and no dither. */
    /* The cube row. Geometry and tokens are the Appearance row's own, so the
       two read as one control group; only the width is fixed, because a
       single cube stretched across the panel would not look like a cube. */
    /* One literal, rules back to back: the array this replaced joined with no
       separator, so a newline here would change the sheet's bytes. */
    const CSS = `body[data-dsw-win2k]{--dsw-corner-shape:square}body[data-dsw-win2k] ::selection{background:#0a246a;color:#ffffff}body[data-dsw-win2k],body[data-dsw-win2k] *{--dsw-elevation-stroke-color:#404040;--dsw-elevation-panel:0 0 0 1px #404040,2px 2px 3px rgba(0,0,0,.35);--dsw-elevation-prominent:0 0 0 1px #404040,2px 2px 4px rgba(0,0,0,.4);--dsw-elevation-soft:0 0 0 1px #808080,2px 2px 3px rgba(0,0,0,.3)}body[data-dsw-win2k]{--dsh-scrollbar-width:16px;--dsh-scrollbar-thumb-border:0px}body[data-dsw-win2k] ::-webkit-scrollbar-track{background:repeating-conic-gradient(#ffffff 0% 25%,#d4d0c8 0% 50%) 0 0/2px 2px;box-shadow:inset 1px 1px 0 #404040,inset -1px -1px 0 #ffffff}body[data-dsw-win2k] ::-webkit-scrollbar-thumb{border-radius:0;border:1px solid #808080;background:#d4d0c8;background-clip:border-box;box-shadow:inset 1px 1px 0 #ffffff,inset -1px -1px 0 #404040}body[data-dsw-win2k] ::-webkit-scrollbar-thumb:hover{background-color:#c0bdb6}body[data-dsw-win2k] ::-webkit-scrollbar-corner{background:#d4d0c8}@supports not selector(::-webkit-scrollbar){body[data-dsw-win2k],body[data-dsw-win2k] *{scrollbar-width:auto;scrollbar-color:#d4d0c8 #ffffff}}.dw-group{display:flex;flex-direction:column;gap:8px;padding:16px 0;border-bottom:0.5px solid var(--dsw-alias-border-l2)}.dw-title{font-size:14px;font-weight:400;line-height:22px;color:var(--dsw-alias-label-primary)}.dw-cubes{display:flex;align-items:stretch;gap:8px;flex-wrap:wrap}.dw-cube{box-sizing:border-box;flex:0 1 180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:20px 32px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:20px;background:transparent;font:inherit;font-size:14px;line-height:22px;color:var(--dsw-alias-label-primary);cursor:pointer}.dw-cube:hover{background:var(--dsw-alias-interactive-bg-hover)}.dw-cube-selected{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}.dw-desc{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}`

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
