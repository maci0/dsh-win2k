/**
 * Generate TOKENS.md from the sheet's own token map.
 *
 * The sheet declares its `--dsw-*` overrides as a JavaScript object; this reads that
 * object and writes the reference table, so the document cannot drift from the code.
 * Run `node tools/tokendoc.mjs` after changing the map. No browser needed.
 */
import { readFileSync, writeFileSync } from 'node:fs'

const src = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
const block = src.match(/const TOKENS = \{([\s\S]*?)\n  \}/)
if (!block) throw new Error('token map not found in lib/client.js')
const pairs = [...block[1].matchAll(/'(--[a-z0-9-]+)':\s*'([^']+)'/g)].map(m => [m[1], m[2]])

const groups = new Map()
for (const [name, value] of pairs) {
  const g = name.replace(/^--(dsw|dsh)-/, '').split('-').slice(0, 2).join('-')
  if (!groups.has(g)) groups.set(g, [])
  groups.get(g).push([name, value])
}

const lines = [
  '# Token reference',
  '',
  'Generated from the sheet\'s own token map by `tools/tokendoc.mjs` — do not edit by hand,',
  'and re-run the generator after changing the map. Every value here is a Windows 2000',
  'palette colour or one of the shell\'s measures; see [DESIGN.md](DESIGN.md) for what each',
  'group is for.',
  '',
  `**${pairs.length} tokens**, in ${groups.size} groups.`,
  '',
]
for (const [g, rows] of [...groups.entries()].sort((a, b) => b[1].length - a[1].length)) {
  lines.push(`## ${g} (${rows.length})`, '', '| token | value |', '|---|---|')
  for (const [name, value] of rows.sort()) lines.push(`| \`${name}\` | \`${value}\` |`)
  lines.push('')
}
writeFileSync(new URL('../TOKENS.md', import.meta.url), lines.join('\n'))
console.log(`wrote TOKENS.md: ${pairs.length} tokens in ${groups.size} groups`)
