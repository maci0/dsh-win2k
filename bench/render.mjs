/**
 * Deterministic bench for the win2k browser half.
 *
 * Scenario is fixed and offline: the shipped artifact is evaluated with the
 * counting stub in `harness.ts`, so what is reported is the work the plugin
 * actually does — no browser, no server, no network.
 *
 *   init       full module evaluation, warm (V8 compile cache hit) and cold
 *              (unique source per rep, which is what a page load sees)
 *   events     10k settings snapshot publishes + 10k cube-row renders
 *              (steadyState is the same path with the flag held on)
 *
 * The chrome sheet is one pre-normalized line in the source, so there is no
 * normalizer left to bench. The pass that was removed here measured, per
 * evaluation: 1.57M instructions, 3.8k cache misses, 56us CPU over the sheet,
 * warm init p50 107us -> 35us. Re-measure before/after a sheet edit with
 * `taskset -c 2 perf stat -e instructions,cache-misses -- node bench/render.mjs
 * --only=init --reps=100` and `node --cpu-prof`.
 *
 * A CSS edit has to re-normalize the literal, or the emitted sheet keeps its
 * newlines. The one-liner:
 *
 *   node -e 'const fs=require("fs"),P="lib/client.js";const s=fs.readFileSync(P,"utf8");const m="const CSS = `";const a=s.indexOf(m)+m.length,b=s.indexOf("`",a);fs.writeFileSync(P,s.slice(0,a)+s.slice(a,b).replace(new RegExp("\\n\\s*","g"),"")+"`"+s.slice(b+1))'
 *
 * Usage:
 *   taskset -c 2 node bench/render.mjs [--only=all|init|events] [--reps=60]
 *                                      [--events=10000]
 */

import { readBundle, mount } from './harness.ts'

const BUNDLE = readBundle()

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
    return [key, value]
  }),
)
const reps = Number(args.get('reps') ?? 60)
const eventCount = Number(args.get('events') ?? 10_000)
const only = args.get('only') ?? 'all'

const OFF = { status: 'ready', value: { selected: false }, writable: true }

/** Run `fn` once, returning CPU microseconds it burned. */
function cpuUs(fn) {
  const before = process.cpuUsage()
  fn()
  const after = process.cpuUsage(before)
  return after.user + after.system
}

function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b)
  const at = (q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  return { p50: at(0.5), p95: at(0.95), min: sorted[0] }
}

/** `warm` re-evaluates the same source string; `cold` gives V8 a fresh one. */
function runInit(cold) {
  const samples = []
  const passes = reps + 10
  for (let i = 0; i < passes; i += 1) {
    const source = cold ? `${BUNDLE}\n// rep ${i}` : BUNDLE
    const us = cpuUs(() => { mount(source, OFF) })
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

function runCounterChurn() {
  const harness = mount(BUNDLE, OFF)
  harness.publish(1, () => true)
  const before = { ...harness.counters }
  harness.publish(1000, () => true)
  harness.renderRow(1000)
  const delta = {}
  for (const [key, value] of Object.entries(harness.counters)) delta[key] = value - before[key]
  return delta
}

const report = {}
if (only === 'all' || only === 'events') {
  report.events = runEvents()
  report.steadyState = runCounterChurn()
}
if (only === 'all' || only === 'init') {
  report.initWarm = runInit(false)
  report.initCold = runInit(true)
}

console.log(JSON.stringify({
  node: process.version,
  cpu: /model name\s*:\s*(.*)/.exec((await import('node:fs')).readFileSync('/proc/cpuinfo', 'utf8'))?.[1],
  bundleBytes: BUNDLE.length,
  reps,
  events: eventCount,
  ...report,
}, null, 2))
