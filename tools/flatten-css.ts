/**
 * Re-normalize the stylesheet literal in `lib/client.js` after a CSS edit: the
 * shipped sheet is one line, so every newline and the indent after it become
 * one space. Joining with nothing glued words together across line breaks in
 * comments ("safebecause"), which is why this is a script and not a one-liner.
 *
 * Usage: bun tools/flatten-css.ts [path]   (default lib/client.js)
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const MARKER = 'const CSS = `'

/**
 * Flatten the CSS template literal inside a client bundle's source.
 * @param source - the bundle text.
 * @returns the text with the literal on one line; unchanged when already flat.
 * @throws when the bundle has no `const CSS = \`` literal.
 */
export function flatten(source: string): string {
  const start = source.indexOf(MARKER)
  if (start < 0) throw new Error(`no ${MARKER} literal to flatten`)
  const from = start + MARKER.length
  const to = source.indexOf('`', from)
  if (to < 0) throw new Error('the CSS literal is not closed')
  const css = source.slice(from, to).replace(/[ \t]*\r?\n\s*/g, ' ')
  return source.slice(0, from) + css + source.slice(to)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = process.argv[2] ?? 'lib/client.js'
  writeFileSync(path, flatten(readFileSync(path, 'utf8')))
}
