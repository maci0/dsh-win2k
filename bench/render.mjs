/**
 * Deterministic bench for the win2k browser half.
 *
 * Scenario is fixed and offline: the shipped artifact is evaluated with the
 * counting stub in `harness.ts`, so what is reported is the work the plugin
 * actually does: no browser, no server, no network.
 *
 *   init       warm (the factory re-run on an already imported bundle) and
 *              cold (a fresh process importing the bundle per rep, which is
 *              what a page load sees)
 *   events     10k settings snapshot publishes + 10k cube-row renders
 *
 * The chrome sheet is one pre-normalized line in the source, so there is no
 * normalizer left to bench. The pass that was removed here measured, per
 * evaluation: 1.57M instructions, 3.8k cache misses, 56us CPU over the sheet,
 * warm init p50 107us -> 35us. Re-measure before/after a sheet edit with
 * `taskset -c 2 perf stat -e instructions,cache-misses -- bun bench/render.mjs
 * --only=init --reps=100` and `bun --cpu-prof`.
 *
 * A CSS edit has to re-normalize the literal, or the emitted sheet keeps its
 * newlines: run `bun tools/flatten-css.ts`.
 *
 * Usage:
 *   taskset -c 2 bun bench/render.mjs [--only=all|init|events] [--reps=60]
 *                                      [--events=10000]
 */

import { statSync } from 'node:fs'
import { cpus } from 'node:os'
import { parseArgs } from 'node:util'
import { BUNDLE_URL, coldInitSampleUs, loadBundle, mount } from './harness.ts'

const BUNDLE = await loadBundle()

const { values: args } = parseArgs({
  options: {
    only: { type: 'string', default: 'all' },
    reps: { type: 'string', default: '60' },
    events: { type: 'string', default: '10000' },
  },
})
const reps = Number(args.reps)
const eventCount = Number(args.events)
const only = args.only

const OFF = { status: 'ready', value: { selected: false }, writable: true }

/** Run `fn` once, returning CPU microseconds it burned. */
async function cpuUs(fn) {
  const before = process.cpuUsage()
  await fn()
  const after = process.cpuUsage(before)
  return after.user + after.system
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b)
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  return { p50: at(0.5), p95: at(0.95), min: sorted[0] }
}

/** `warm` re-runs the loaded factory; `cold` imports the file afresh. */
async function runInit(cold) {
  const samples = []
  const passes = reps + 10
  for (let i = 0; i < passes; i += 1) {
    const us = cold ? coldInitSampleUs() : await cpuUs(() => { mount(BUNDLE, OFF) })
    if (i >= 10) samples.push(us)
  }
  return stats(samples)
}

function runEvents() {
  const harness = mount(BUNDLE, OFF)
  const before = { ...harness.counters }
  harness.publish(eventCount, (i) => i % 2 === 0)
  harness.renderRow(eventCount)
  const delta = {}
  for (const [key, value] of Object.entries(harness.counters)) delta[key] = value - before[key]
  return delta
}

const report = {}
if (only === 'all' || only === 'events') {
  report.events = runEvents()
}
if (only === 'all' || only === 'init') {
  report.initWarm = await runInit(false)
  report.initCold = await runInit(true)
}

console.log(JSON.stringify({
  bun: Bun.version,
  cpu: cpus()[0]?.model,
  bundleBytes: statSync(BUNDLE_URL).size,
  reps,
  events: eventCount,
  ...report,
}, null, 2))
