# dsh-win2k

**Windows 2000 theme for DeepSeek Harness.**

The palette is the Windows 2000 registry colour set (`HKCU\Control Panel\Colors`:
ButtonFace `#d4d0c8`, ActiveTitle `#0a246a`, Window `#ffffff`, GrayText `#808080`,
ButtonDkShadow `#404040`, InfoWindow `#ffffe1`) mapped onto the Web client's
`--dsw-alias-*` tokens — the same values the win2k theme sheets in this author's
other projects carry (`clanker/themes/win2k.json`).

| Capability | Extension point | Effect |
|---|---|---|
| Theme | `ctx.theme.register()` | Registers `win2k` (`colorScheme: 'light'`) with the alias-token overrides that repaint every surface: grey face chrome, white document well, navy accent, black/grey ink, `#ffffe1` tips. |
| Cube | `settings.general.item` (order 12) | A **Theme** row with a **Windows 2000** cube directly under the built-in Appearance cubes, wearing their chrome. Clicking it applies the theme and persists the choice. |
| Chrome | plugin-owned `<style>` tag | What a token cannot spell: square corners (`--dsw-corner-shape: square`), **MS Sans Serif** and Lucida Console, navy `::selection`, black-framed hard shadows on menus and dialogs, and the 16px beveled dithered scrollbar. Every rule is scoped under `body[data-dsw-win2k]`, so the sheet is inert under light/dark/system. |
| Persistence | `ctx.settings.installSection()` | The `win2k` settings namespace holds `selected`, so the theme comes back after a reload and is switchable from the cube. |
| Row config | `apply(ctx, config)` | `selected: true\|false` sets the composition-layer default; an invalid value fails while the plugin loads. |

## Why its own cube, not the Appearance row

The stock Appearance row renders three hardcoded cubes (Light, Dark, System)
and the durable `ui-theme` schema accepts only those three ids, so a theme
registered through `ctx.theme` has nowhere to appear and no way to persist.
This plugin therefore draws its own cube through the public
`settings.general.item` slot — no core change, and no second copy of another
plugin's control — and keeps the choice in its own namespace.

While the cube is on, the applier re-forces `win2k` on every `theme/change`:
clicking Light/Dark/System bounces back, and the row says so. That is
deliberate. The durable theme preference cannot hold `win2k`, so the
alternative — letting a built-in click win silently — would resurrect win2k on
the next reload anyway, just without telling anyone.

## Install

```sh
dsh plugin --profile web add https://github.com/maci0/dsh-win2k
```

Or by hand in `~/.dsh/profiles/web`:

```sh
pnpm add github:maci0/dsh-win2k#v0.3.0
```

Then merge `cordis.patch.yml` into `~/.dsh/profiles/web/cordis.patch.yml`.
That file is live-watched, so saving it remounts the plugin:

```yaml
- insert:
    - id: win2k
      name: 'dsh-win2k'
      config:
        selected: true
```

`insert` does not dedupe ids: never also list this package in
`dsh.profile.bundles`. Refresh the page once — the client module graph is
composed per index render.

## Verify

- Settings → General shows a **Theme** row under **Appearance** with a
  **Windows 2000** cube; selecting it turns the shell grey-faced and
  square-cornered, grows the scrollbars to 16px with a dithered track, and
  drops the soft menu glow for a black frame.
- Switching the cube off restores the previous built-in preference and leaves
  the base palette clean.
- `npm test` covers the registration, the sheet scoping, the cube wiring, the
  applier, and the host namespace; none of it proves the *look*, which needs a
  browser.

## Layout

```
src/index.ts   host plugin: the win2k settings namespace (what persists the choice)
lib/client.js  browser half: theme registration, chrome sheet, applier, cube row
cordis.patch.yml
tests/win2k.test.ts
```

## Deliberately not included

- **The win2k cursors.** The reference sheet carries twelve SVG data-URL
  pointers (`%SystemRoot%\cursors`, hotspots included). Most users never notice
  a custom pointer, and it is a screenful of string noise.
- **Title bar, taskbar, Start menu, common dialogs.** This page has no such
  markup.
- **Period metrics.** 16px touch targets and 23px push buttons would fight the
  client's own minimums and keyboard affordances.
- **A focus ring restyle.** A 1px dotted rect is period-correct and too faint
  to be the only keyboard affordance here; the client's own ring stays.
- **A Plugins-tab card.** The cube is the switch; a second one in Plugin
  configuration would be a duplicate control with its own state.

## License

MIT.
