# Audit suite

Fourteen checks that measure this theme against the running client. They are how every
rule in this plugin was verified, and how the figures in [DESIGN.md](../DESIGN.md)
were taken. Run them after any change to `lib/client.js`.

## Running

Each script drives a headless Chromium against a live `dsh web` on
`http://127.0.0.1:3080` with this plugin enabled, and prints a per-view report.
The preamble they share (chromium, the cookie, the win2k toggle, the session
walk and the class-name reader) is `_page.mjs`; a check imports `page`,
`openSession()` and `browser` from it.

```sh
# 1. an auth cookie, written as { "name": "...", "value": "..." }
#    the dev server's cookie is in ~/.dsh/.credentials.yaml
export DSH_COOKIE=.scratch/cookie.json   # gitignored; also the default when unset

# 2. run a check
bun tools/paletteaudit.mjs
```

Playwright must be resolvable from here. Either install it in this package, or point
`DSH_PLAYWRIGHT` at an installed copy: the scripts import it dynamically, so a path
works as well as a package name:

```sh
export DSH_PLAYWRIGHT=/home/you/node_modules/playwright/index.mjs
```

## What each one does

| script | check |
|---|---|
| `paletteaudit.mjs` | every element's background, text, border and gradient stop, classified against the 16-colour set, plus a token-level pass for translucent `--dsw-*` values |
| `contrast.mjs` | every text node against its nearest opaque ancestor; under 3:1 is flagged |
| `fontaudit.mjs` | every leaf text node's family; anything outside the three embedded faces is flagged |
| `offgrid.mjs` | every computed padding, margin and gap against the shell's spacing set |
| `spacing.mjs` | histograms of padding, margin and gap per property, for reading the distribution rather than exceptions |
| `iconsize.mjs` | every bitmap host against the size its rule asks for, to catch crops |
| `motion.mjs` | every element's transition durations and running animations, with their durations and iteration counts |
| `typescale.mjs` | type off the sheet's scale and fractional border widths, in the trajectory and every settings subpage: the views the shell-wide sweeps skip. It found 10px kind tags, an 8px turn label and 18px page headings |
| `orphans.mjs` | glyphs whose children this sheet hides with no bitmap to replace them: the state the blank copy plate was in |
| `disabled.mjs` | every disabled control's ink, against the etched grey. This sheet forces opacity 1 on disabled elements so the etch is the only signal; this checks the etch is actually there |
| `edges.mjs` | every control with both a border and an inset bevel (two edges), and any element still carrying a border radius. Fields are exempt from the border half: a win2k field's 1px sunken border *is* its edge |
| `overlap.mjs` | two siblings' text drawn over each other |
| `overflow.mjs` | text a box cannot show without an ellipsis, and children escaping their parent's box, excluding deliberate bleeds (a negative margin), clamps and decorative absolutes |
| `conformance.mjs` | the app against DESIGN.md's metric table, every row of it: push button, tool row, tree row, both tab states, caption band and control, status bar, toolbar chip, dialog combo and close, rail cell, stepper, checkbox/switch and the scrollbar's width |

## Two things that waste time

- **The auth cookie expires mid-session.** The scripts then fail trying to click
  Settings, because the page says "authentication required". Re-mint the cookie rather
  than debugging the theme.
- **A cached decoded asset can lie.** A toolbar strip decoded earlier in a session was
  wrong; re-decoding from the binary fixed it. If a crop looks impossible, re-decode.


### Visual and asset regression

Run `bun tools/visual.mjs` against the web profile. In addition to `DSH_COOKIE`
and `DSH_PLAYWRIGHT`, `DSH_CHROMIUM` can select an installed Chromium executable;
`DSH_VISUAL_OUTPUT` sets the screenshot/report directory. Its default is
`.scratch/visual`. `DSH_WIN2K_BUNDLE` can select a candidate artifact for any audit script.
The shared preview loads its actual factory without writing profile settings.
The checks inspect native CSS and never submit settings or model requests.

To reproduce the tree assets, place the original SP4 `comctl32.dll` beside the
capture program and compile it with `i686-w64-mingw32-gcc capture-tree.c -o
capture-tree.exe -lgdi32 -luser32`. Run in an isolated Wine prefix with
`WINEDLLOVERRIDES=comctl32=n`; the program refuses a substitute tree class.
Crop `(5, 8, 14, 17)` from each resulting BMP, retaining its exact pixels.
`reference/provenance.json` records the DLL hashes and IE cursor resource.
