/**
 * Deterministic performance gate for the win2k browser half.
 *
 * No wall clock: the assertions are work counters the shipped code moves
 * (DOM writes, element allocations, style bytes handed to the CSS parser) plus
 * one CPU-time ceiling. Wall clock is what the user feels, but it moves with
 * frequency scaling and noisy neighbours, so it is not a gate.
 *
 * Scenario: the shipped `lib/client.js`, evaluated the way the client module
 * system loads it, against the counting stub in `bench/harness.ts`. Recorded
 * baseline for the CPU ceiling: AMD Ryzen 9 9950X, node v26.9.0, median cold
 * (fresh V8 compilation, what a page load sees) module evaluation 2.4ms.
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { mount, readBundle, type Harness, type Snapshot } from '../bench/harness.ts'

const BUNDLE = readBundle()
const OFF: Snapshot = { status: 'ready', value: { selected: false }, writable: true }

/**
 * Bytes of chrome sheet the module hands the engine, recorded on the baseline
 * above. The sheet is stored pre-normalized, so this is an equality: a runtime
 * normalizer would re-emit the same bytes but pay a second 168KB copy, and
 * newlines left in the literal would move the number.
 */
const SHEET_BYTES = 167_594

/** Median CPU microseconds of `runs` evaluations of a fresh (uncompiled) source. */
function coldInitUs(runs = 15): number {
  const samples: number[] = []
  for (let i = 0; i < runs + 3; i += 1) {
    // A unique trailing comment defeats V8's compilation cache, so every
    // iteration pays what a page load pays.
    const source = `${BUNDLE}\n// ${i}`
    const before = process.cpuUsage()
    mount(source, OFF)
    const after = process.cpuUsage(before)
    if (i >= 3) samples.push(after.user + after.system)
  }
  return samples.sort((a, b) => a - b)[Math.floor(samples.length / 2)] ?? Number.POSITIVE_INFINITY
}

/** Mount once and hand back the harness with counters starting at zero usage. */
function mounted(): Harness {
  return mount(BUNDLE, OFF)
}

test('module init hands the CSS engine one sheet and stays off the event path', () => {
  const harness = mounted()

  // One <style> element, one CSS parse, and the sheet bytes are the parser's
  // whole input: a ceiling, so a runaway sheet fails here instead of at paint.
  assert.equal(harness.counters.headAppend, 1, 'one plugin-owned <style> tag')
  assert.equal(harness.counters.createElement, 1, 'no element churn at init')
  assert.equal(
    harness.counters.cssBytes,
    SHEET_BYTES,
    `init must hand the parser the recorded sheet, got ${harness.counters.cssBytes} bytes`,
  )
  // Normalizing the sheet at runtime was 1.57M instructions, 3.8k cache misses
  // and ~70us of CPU per evaluation (`perf stat -e instructions,cache-misses`,
  // `--variant=plain` vs the shipped sheet). Storing it pre-normalized in the
  // source deleted that pass, so init must rewrite nothing sheet-sized.
  assert.equal(harness.counters.sheetRewrites, 0, 'init rewrites no sheet-sized string')

  // Cold evaluation is the page-load cost. Baseline 2.4ms; the ceiling only
  // catches a catastrophic regression, which is what a stable CI gate can do.
  const us = coldInitUs()
  assert.ok(us < 15_000, `cold module evaluation was ${us}us of CPU, baseline is 2400us`)
})

test('a settings snapshot costs one body write and never re-stacks the layer', () => {
  const harness = mounted()
  // Mount applies the flag once; count the snapshot path alone.
  const stacked = harness.counters.layerStacked
  const writes = harness.counters.toggleAttribute
  harness.publish(10_000, () => true)

  // The flag changes once, so the palette is stacked exactly once — work is
  // proportional to the change, not to the number of snapshots.
  assert.equal(harness.counters.layerStacked - stacked, 1, 'one stack for 10k snapshots')
  assert.equal(harness.counters.layerRetracted, 0, 'nothing retracts it while it is on')
  // One attribute write per snapshot: an amplification (sync run twice, a
  // listener re-entered) shows up here, not as jank in the browser.
  assert.equal(harness.counters.toggleAttribute - writes, 10_000, 'one body write per snapshot')
  assert.equal(harness.counters.settingsSet, 0, 'a snapshot is never written back')
  // The snapshot path must not render the settings row.
  assert.equal(harness.counters.reactElement, 0, 'no row render per snapshot')
})

test('the cube row allocates a bounded tree per render and unload releases the layer', () => {
  const harness = mounted()
  harness.publish(1, () => true)

  const before = harness.counters.reactElement
  harness.renderRow(1_000)
  const perRender = (harness.counters.reactElement - before) / 1_000
  assert.ok(perRender >= 1 && perRender <= 8, `row render allocated ${perRender} elements`)

  harness.dispose()
  assert.equal(harness.layers.size, 0, 'unload retracts the token layer')
  assert.equal(harness.counters.removeAttribute, 1, 'unload clears the chrome scope once')
})
