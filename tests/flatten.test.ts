import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { flatten } from '../tools/flatten-css.ts'

test('flatten joins lines with one space, so words never glue', () => {
  const source = 'x\nconst CSS = `a {\n  color: red;\n}\n/* keeps the\n   space */`\ny'
  assert.equal(flatten(source), 'x\nconst CSS = `a { color: red; } /* keeps the space */`\ny')
})

test('the shipped sheet is already flat', () => {
  const shipped = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')
  assert.equal(flatten(shipped), shipped)
})

test('a bundle without the literal is refused', () => {
  assert.throws(() => flatten('const X = 1'), /no const CSS/)
})
