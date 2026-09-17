# dsh-win2k

**Windows 2000 theme for DeepSeek Harness.**

The palette is the Windows 2000 registry colour set (`HKCU\Control Panel\Colors`:
ButtonFace `#d4d0c8`, ActiveTitle `#0a246a`, Window `#ffffff`, GrayText `#808080`,
ButtonDkShadow `#404040`, InfoWindow `#ffffe1`) mapped onto the Web client's
`--dsw-alias-*` tokens — the same values the win2k theme sheets in this author's
other projects carry (`clanker/themes/win2k.json`).

| Capability | Extension point | Effect |
|---|---|---|
| Theme | `ctx.theme.register()` | Registers `win2k` (label **Windows 2000**, `colorScheme: 'light'`) with the alias-token overrides that repaint every surface: grey face chrome, white document well, navy accent, black/grey ink, `#ffffe1` tips. |
| Chrome | plugin-owned `<style>` tag | What a token cannot spell: square corners (`--dsw-corner-shape: square`), **MS Sans Serif** and Lucida Console, navy `::selection`, black-framed hard shadows on menus and dialogs, and the 16px beveled dithered scrollbar. Every rule is scoped under `body[data-dsw-win2k]`, an attribute the browser half toggles from the theme snapshot, so the sheet is inert under light/dark/system. |

## Where it appears

Settings → General → **Appearance**, as a fourth cube labelled **Windows 2000**
beside Light / Dark / System. Picking it persists like any other choice.

That needs one core change this plugin depends on: the stock Appearance row
renders three hardcoded cubes and the durable theme schema accepts only
`light`/`dark`/`system`, so a registered theme had no way in. The
`packages/client/ui-theme` change adds:

- an optional `label` on `ThemeDefinition` (the cube falls back to the id);
- one cube per registered theme, after the built-ins;
- a durable preference that carries any id — a page whose build does not serve
  the named theme paints the default palette instead of failing the read, and
  keeps the id so the build that does serve it switches over with no rewrite.

## Install

```sh
dsh plugin --profile web add https://github.com/maci0/dsh-win2k
```

Or by hand in `~/.dsh/profiles/web`:

```sh
pnpm add github:maci0/dsh-win2k#v0.2.0
```

Then merge `cordis.patch.yml` into `~/.dsh/profiles/web/cordis.patch.yml`.
That file is live-watched, so saving it remounts the plugin:

```yaml
- insert:
    - id: win2k
      name: 'dsh-win2k'
```

`insert` does not dedupe ids: never also list this package in
`dsh.profile.bundles`.

Restart `dsh web` after installing: the durable theme schema lives in the host
half, and the running process holds the one it booted with. Refresh the page
afterwards for the client module graph.

## Verify

- Settings → General → **Appearance** shows a fourth cube, **Windows 2000**;
  selecting it turns the shell grey-faced and square-cornered, grows the
  scrollbars to 16px with a dithered track, and drops the soft menu glow for a
  black frame.
- Switching back to Light/Dark/System removes every one of those chrome rules
  (the scoped attribute goes with the theme) and leaves the base palette clean.
- `npm test` covers the registration, the sheet scoping, and the scope
  attribute; none of it proves the *look*, which needs a browser.

## Layout

```
src/index.ts   host plugin: a module for the Loader row to load, nothing more
lib/client.js  browser half: the theme registration, the chrome sheet, the scope attribute
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
- **A settings card.** The Appearance cube is the control; a second one in
  Plugin configuration would be a duplicate switch with its own state.

## License

MIT.
