# The Windows 2000 design system, as implemented here

This is the reference this plugin is built against: what the shell looked like, which
of its measures are reproduced, and how each one is verified. Every number is either
read off the live client (the audit scripts print the measurement) or taken from the
Windows 2000 Professional SP4 media the plugin's author supplied.

## 1. Method

Nothing in this sheet is guessed. Three sources, in order of authority:

1. **The media.** `SHELL32.DL_`, `COMCTL32.DL_`, `EXPLORER.EX_`, `SHDOCVW.DL_`,
   `INETCPL.CP_`, `MSIMN.EX_`, `MORICONS.DL_` and the CD's own screenshots
   (`SYSTPROP.GIF`, `STRTMENU.GIF`, `DISKM.GIF`, `ADDREMVE.JPG`, `EXPLORER.GIF`,
   `CPANEL.GIF`). The screenshots settle questions that reasoning does not: the tab
   strip's construction came from `SYSTPROP.GIF`, the caption gradient from the desktop
   captures.
2. **The live client.** Every rule is measured after it is written — computed styles,
   bounding boxes, and hit-testing — rather than eyeballed. The audit suite in §9 is
   that process made repeatable.
3. **The client's own stylesheets**, read to find what is already correct. A defect is
   usually this sheet overriding something the client got right, not the client being
   wrong.

## 2. Palette

Windows 2000 shipped a 16-colour system palette. Anything outside it is a bug in this
sheet.

| name | value | used for |
|---|---|---|
| Black | `#000000` | window text, icons |
| Maroon | `#800000` | strings, error ink |
| Green | `#008000` | comments, positive state |
| Olive | `#808000` | warning ink, timeline tool bars |
| Navy | `#000080` | links, keywords, selection ink |
| Purple | `#800080` | reserved; unused |
| Teal | `#008080` | constants |
| Silver | `#c0c0c0` | toolbar bitmap mask |
| Grey | `#808080` | disabled ink, grooves, separators |
| White | `#ffffff` | window and field faces |
| **ButtonFace** | `#d4d0c8` | every chrome surface |
| **ActiveTitle** | `#0a246a` | caption, selection, chosen rows |
| **GradientActiveTitle** | `#a6caf0` | caption gradient end, accent hover |
| **InfoWindow** | `#ffffe1` | infotips, warn labels |
| **GrayText** | `#808080` | disabled labels |
| **ButtonDkShadow** | `#404040` | secondary text, sunken edges |
| **ButtonHilite / 3DLight** | `#ffffff` / `#b5b5b5` | bevel highlights |

Two rules follow from it:

- **No translucency.** A win2k surface is an opaque palette colour. A 10% tint
  composites to something the palette cannot name, so every `--dsw-*` surface and ink
  token here is opaque. The only exceptions are the modal masks (`--dsw-alias-bg-mask-*`),
  which are a deliberate modern concession — see §8.
- **No gradients except the caption's**, whose two stops are ActiveTitle and
  GradientActiveTitle.

## 3. Metrics

Measured on the live client. Values in the "measure" column are what a win2k control of
that class was.

| control | height | type | notes |
|---|---|---|---|
| Push button | **23px** | 12px | win2k's standard button was 75×23 |
| Toolbar / icon button | **22px** | 12px | 16px glyph, 2px either side, 22px floor |
| Field, combo, chip | **22px** | 12px | white sunken face, 1px groove |
| Checkbox / radio | **13px** | — | 13×13, sunken white, black tick |
| Tab | **22px** (selected 23px) | 12px | contiguous; selected is 1px taller and open along the bottom |
| Tree / list row | **22px** | 12px | 16px icon slot, 4px inset |
| Tool row (transcript) | **24px** | 12–13px | 16px glyph slot, title column at 553 |
| Trajectory table row | **24px** | 12px | cell height 24, event inside 22 |
| Caption bar | **20px** | 12px bold | |
| Caption control | **18px** | 11px | 22px wide for icon plates |
| Status bar | **27px** | 11px | spans the pane, flat panes with dividers |
| Menu item | **18px** | 12px | 20px check gutter |
| Scrollbar | **16px** | — | arrows, thumb, size grip at the corner |

**Type scale.** Chrome is 12px; status readouts 11px; the caption title 12px bold;
transcript content keeps its own sizes for reading. Nothing fractional: the client's
13.3333px default and its `0.875em` inline code were both on the wrong side of this
line and were snapped.

**Spacing set.** Windows 2000 built its chrome from **1, 2, 3, 4, 6, 7, 8, 10, 11, 12,
16, 20, 24**. Nothing in a dialog lands on 5, 9, 14, 18 or 22. Four values of 3px
remain on purpose: the caption's text inset, the tab strip's inset that has to match
it, and the sidebar's logo row — 3px is the shell's own caption and toolbar measure.

## 4. Bevels and surfaces

Two bevels do all the work, both 2px, both from the shell's light/shadow pairs:

```
--dw-raised: inset -1px -1px #0a0a0a, inset 1px 1px #ffffff,
             inset -2px -2px #808080, inset 2px 2px #d4d0c8
--dw-sunken: inset 1px 1px #0a0a0a, inset -1px -1px #ffffff,
             inset 2px 2px #808080, inset -2px -2px #d4d0c8
```

Consequences enforced across the sheet:

- **`border-radius: 0` everywhere.** One global rule; a win2k control has no radius.
- **One edge per control.** A control with the raised bevel must not also carry a 1px
  border — that is two edges, which is what the Models page's buttons and the add tiles
  had.
- **Faces are the same colour as the page** for docking chrome (toolbars, status bar,
  caption aside), so separation comes from the bevel and from 1px grooves, not from
  fill contrast.
- **Selection is navy with white ink**; hover is `#e4e1dc`; pressed is `#c0bdb6`.

## 5. Chrome anatomy

- **Caption.** 20px, ActiveTitle to GradientActiveTitle, running left to right. Title in
  12px bold Tahoma, `#ffffff`, inset 3px. Controls are 18px plates inset 20px from each
  end; the control group carries no negative margin (a `-16px` one made the panel toggle
  hang outside the band).
- **Tabs.** Contiguous — no gap, one tab starting where the last ends. Unselected: face
  grey, raised, white top-left / black bottom-right. Selected: white, 1px black on three
  sides, 1px taller, covering the strip's rule so the pane below flows out of it.
- **Status bar.** Spans the pane's content width, panes left-aligned with 6px padding and
  1px dividers, everything flat — including plugin readouts injected into it.
- **Scrollbars.** 16px, raised arrow plates, sunken thumb, and the size grip drawn in the
  corner where two scrollbars meet.
- **Menus.** Face grey with 2px padding, a 16px check slot ordered to the left of the
  label, 18px item height at 6px either side, and a hard `2px 2px 0 rgba(0,0,0,.35)` cast
  shadow — never a blur.
- **Trees.** 22px rows with a 16px expander slot and a 4px row inset; the level
  indentation is the client's own, left as it is.
- **Infotips.** `#ffffe1` with a 1px black frame and black text — including the session
  hover card, which the client renders as a floating body-level element.
- **Progress.** Sunken 14px track with segmented bars; the reasoning "Think" rows use the
  shell's state marks rather than a shimmer.

## 6. Iconography

- **16px art, pixel-exact.** Real bitmaps are drawn at their natural size and contained
  to their host box; `image-rendering: pixelated` keeps them square.
- **Hide-and-paint.** A control whose glyph cannot be recoloured gets its children hidden
  (`svg * { display: none }`) and a bitmap painted as the element's background. Where the
  client's glyph is correct, it is left alone.
- **Containment.** Every bitmap host uses `background-size: contain`, so a 16px bitmap in
  a 15px host is scaled rather than cropped.
- **Provenance.** Each mark's source binary and resource id is recorded in the README's
  asset table. Six marks are still hand-drawn: the +/− tree boxes, dropdown triangles,
  checkbox tick, switch, plugin package, and the Think lightbulb — Windows 2000 has no
  resource for those.

## 7. Motion

`transition-duration: 0s` and `transition-delay: 0s` on everything. The shell had no
transitions, no fades, no easing. Shadows are hard offsets or absent; no blur anywhere
except where the client's own overlay mask demands one, which this sheet does not add.

## 8. Documented deviations

Deliberate, and each one a judgement rather than an oversight:

- **Modal masks dim the page.** A win2k modal greyed its parent rather than dimming it;
  a dim is what every user expects from a modal today. The masks are the only translucent
  values in the sheet.
- **The transcript is a centred reading column**, not a full-width document view. The
  composer, the To-dos dock and the goal bar all share that column's width axis.
- **Transparency, not translucency, where the client expects a tint.** Where the client
  ships a 10% navy hover, this sheet substitutes the shell's opaque hover face.
- **The deployment's appearance flag is irrelevant to colour.** This sheet forces a light
  UI, so every `--dsw-*` the client's dark appearance overrides is overridden here too —
  all 167 of them. Code-block syntax colours and overlay text are in that set.

## 9. Audit suite

Seven checks, re-runnable after any change, all measured against the running client:

| check | method | last result |
|---|---|---|
| palette | every element's background, text, border and gradient stop, classified by hue and lightness against §2 | 0 offenders in session, trajectory, settings, plugins |
| translucency | any surface or ink with alpha between 0 and 1, at element level **and** token level | 0 (masks excepted) |
| contrast | every text node against its nearest opaque ancestor, under 3:1 flagged | 0 in hero, session, settings, plugins |
| fonts | every leaf text node's family | 0 outside Win2k UI / Tahoma / Mono |
| dark tokens | every `--dsw-*` the client's dark appearance overrides | 167/167 owned |
| geometry | control heights against §3, and row, icon, label and control columns against each other | one column per surface |
| spacing | every computed padding, margin and gap against §3's set | four deliberate 3px insets |

Two operational notes learned the hard way: the dev-server auth cookie **expires
mid-session** (the audits fail with a 401 page rather than a theme error), and a cached
decoded asset can lie — re-decode from the binary before trusting a crop.

## 10. Hazards

The defects in this sheet have come from a small number of repeating causes. Check these
first:

1. **A blanket rule reaching a sibling surface.** `button[class*="action"]` sized the
   trajectory toolbar's labelled toggles; `[class*="_dock"]` collapsed the goal bar;
   `[class*="iconButton"]` cropped a tab-strip mark; a generic button plate dressed a
   plugin's status readout. When a fix is written, ask what *else* matches.
2. **The caption's white ink.** `header … > div:first-child *` paints the caption band's
   text white, and anything that mounts under that row inherits it. Three white-on-grey
   bugs came from it. It is the first rule to check when text turns up invisible near the
   top of the window.
3. **Translucency.** A tint is not a palette colour. It composites to something the audit
   cannot name and the design does not contain.
4. **Invalid declarations.** A stray token in a shorthand (`center/contain 16px`) makes
   the browser drop the declaration silently — the symptom is an empty plate among
   painted ones.
5. **Verifying the asset instead of the browser.** Rendering an extracted PNG proves the
   asset, not the rule. Read the computed style off the live element.
