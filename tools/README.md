# Audit suite

Seven checks that measure this theme against the running client. They are how every
rule in this plugin was verified, and how the figures in [DESIGN.md](../DESIGN.md)
were taken. Run them after any change to `lib/client.js`.

## Running

Each script drives a headless Chromium against a live `dsh web` on
`http://127.0.0.1:3080` with this plugin enabled, and prints a per-view report.

```sh
# 1. an auth cookie, written as { "name": "...", "value": "..." }
#    the dev server's cookie is in ~/.dsh/.credentials.yaml
export DSH_COOKIE=/tmp/dsh-cookie.json

# 2. run a check
node tools/paletteaudit.mjs
```

Playwright must be resolvable from here. Either install it in this package, or point
`DSH_PLAYWRIGHT` at an installed copy — the scripts import it dynamically, so a path
works as well as a package name:

```sh
export DSH_PLAYWRIGHT=/home/you/node_modules/playwright/index.mjs
```

## What each one does

| script | check |
|---|---|
| `paletteaudit.mjs` | every element's background, text, border and gradient stop, classified against the 16-colour set — plus a token-level pass for translucent `--dsw-*` values |
| `contrast.mjs` | every text node against its nearest opaque ancestor; under 3:1 is flagged |
| `fontaudit.mjs` | every leaf text node's family; anything outside the three embedded faces is flagged |
| `offgrid.mjs` | every computed padding, margin and gap against the shell's spacing set |
| `spacing.mjs` | histograms of padding, margin and gap per property, for reading the distribution rather than exceptions |
| `iconsize.mjs` | every bitmap host against the size its rule asks for, to catch crops |
| `conformance.mjs` | the app against DESIGN.md's metric table — heights and type sizes per control class |

## Two things that waste time

- **The auth cookie expires mid-session.** The scripts then fail trying to click
  Settings, because the page says "authentication required". Re-mint the cookie rather
  than debugging the theme.
- **A cached decoded asset can lie.** A toolbar strip decoded earlier in a session was
  wrong; re-decoding from the binary fixed it. If a crop looks impossible, re-decode.
