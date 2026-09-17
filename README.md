# dsh-win2k

**Windows 2000 theme for DeepSeek Harness.**

The palette is the Windows 2000 registry colour set (`HKCU\Control Panel\Colors`:
ButtonFace `#d4d0c8`, ActiveTitle `#0a246a`, Window `#ffffff`, GrayText `#808080`,
ButtonDkShadow `#404040`, InfoWindow `#ffffe1`) mapped onto the Web client's
`--dsw-alias-*` tokens — the same values the win2k theme sheets in this author's
other projects carry (`clanker/themes/win2k.json`).

| Capability | Extension point | Effect |
|---|---|---|
| Palette | `ctx.theme.register()` | A `win2k` theme (`colorScheme: 'light'`) whose alias-token overrides repaint every surface: grey face chrome, white document well, navy accent, black/grey ink, `#ffffe1` tips. |
| Chrome | plugin-owned `<style>` tag | What a token cannot spell: square corners (`--dsw-corner-shape: square`), **MS Sans Serif** / Lucida Console, navy `::selection`, black-framed hard shadows on menus and dialogs, and the 16px beveled dithered scrollbar. |
| On/off | `ctx.settings.installSection()` + `settings.plugin.item` | A **Windows 2000 theme** card in Settings → Plugins → **Plugin configuration** with an On/Off push-button pair. `enabled` persists in `~/.dsh/settings.yaml`. |
| Row config | `apply(ctx, config)` | `enabled: true|false` sets the composition-layer default; an invalid value fails while the plugin loads. |

## How the theme activates

The durable theme schema accepts only `light`, `dark`, and `system`, so a
third-party id cannot be *persisted* as a preference. Instead the applier, in
`lib/client.js`, keeps `ctx.theme` on the `win2k` id while `enabled` is true:
it remembers the preference that was active, calls `setTheme('win2k')`, and
re-forces it on every `theme/change`. Switching the card off restores the
remembered preference.

Consequence: while the card is **On**, the Appearance row is overridden — a
click there is bounced back to win2k, and the card says so. That is the point of
"forced", but it is a real interaction cost, so the copy names it.

## Install

From the Harness checkout (adjust the package path):

```sh
dsh plugin --profile web add /home/maci/dsh-plugins/dsh-win2k
# pnpm warns "declares no dsh.bundle — installed as a plain dependency". That is the point.
```

Or by hand in `~/.dsh/profiles/web`:

```sh
pnpm add file:/home/maci/dsh-plugins/dsh-win2k
```

Then merge `cordis.patch.yml` into `~/.dsh/profiles/web/cordis.patch.yml`.
That file is live-watched, so saving it remounts the plugin. **Refresh the page
once** — the client module graph is composed per index render.

```yaml
- insert:
    - id: win2k
      name: 'dsh-win2k'
      config:
        enabled: true
```

`insert` does not dedupe ids: never also list this package in
`dsh.profile.bundles`.

## Verify

- Settings → Plugins → **Plugin configuration** shows the **Windows 2000 theme**
  card, expanded to an On/Off pair.
- The whole shell goes grey-faced and square-cornered, scrollbars grow to 16px
  with a dithered track, and menus drop the soft glow for a black frame.
- Settings → General → **Appearance** no longer sticks while the card is On
  (the theme re-forces itself); switching the card Off hands the preference
  back.

`npm test` covers the applier, the card wiring, and the host namespace; none of
it proves the *look*, which needs a browser.

## Layout

```
src/index.ts   host plugin: the win2k settings namespace (what makes the card appear)
lib/client.js  browser half: theme registration, chrome sheet, applier, card
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
- **Localized copy.** The card is English-only; the two sibling plugins ship
  `en`+`zh` because their surfaces already read a locale namespace.

## License

MIT.
