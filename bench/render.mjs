/**
 * Deterministic bench for the win2k browser half.
 *
 * Scenario is fixed and offline: the shipped artifact is evaluated with the
 * counting stub in `harness.ts`, so what is reported is the work the plugin
 * actually does — no browser, no server, no network.
 *
 *   normalize  the CSS normalizer (`String.replace`) over the emitted sheet
 *   init       full module evaluation, warm (V8 compile cache hit) and cold
 *              (unique source per rep, which is what a page load sees)
 *   events     10k settings snapshot publishes + 10k cube-row renders
 *
 * Variants: `regex` is the shipped sheet (built, then newline-stripped);
 * `plain` drops the normalizer call, so the same scenarios can be compared.
 *
 * Usage:
 *   taskset -c 2 node bench/render.mjs [--variant=regex|plain] [--only=all]
 *                                      [--reps=60] [--events=10000]
 */

import { readBundle, mount } from './harness.ts'

const BUNDLE = readBundle()

/** The normalizer call as it is spelled in the shipped artifact. */
const NORMALIZE_CALL = "`.replace(/\\n\\s*/g, '')"

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, value = 'true'] = arg.replace(/^--/, '').split('=')
    return [key, value]
  }),
)
const reps = Number(args.get('reps') ?? 60)
const eventCount = Number(args.get('events') ?? 10_000)
const only = args.get('only') ?? 'all'
const variant = args.get('variant') ?? 'regex'

/** The raw `const CSS = ...` payload, taken from the source itself. */
function rawCss(source) {
  const start = source.indexOf('const CSS = `') + 'const CSS = `'.length
  const end = source.indexOf('\n`', start)
  if (start < 0 || end < 0) throw new Error('CSS template literal not found')
  return source.slice(start, end)
}

/** Build the variant source: `plain` drops the normalizer call. */
function variantSource(which) {
  if (which === 'plain') {
    if (!BUNDLE.includes(NORMALIZE_CALL)) throw new Error('normalizer call not found')
    return BUNDLE.replace(NORMALIZE_CALL, '`')
  }
  return BUNDLE
}

const SOURCE = variantSource(variant)
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
    const source = cold ? `${SOURCE}\n// rep ${i}` : SOURCE
    const us = cpuUs(() => { mount(source, OFF) })
    if (i >= 10) samples.push(us)
  }
  return stats(samples)
}

function runEvents() {
  const harness = mount(SOURCE, OFF)
  const before = { ...harness.counters }
  harness.publish(eventCount, (i) => i % 2 === 0)
  harness.renderRow(eventCount)
  const delta = {}
  for (const [key, value] of Object.entries(harness.counters)) delta[key] = value - before[key]
  return delta
}

function runCounterChurn() {
  const harness = mount(SOURCE, OFF)
  harness.publish(1, () => true)
  const before = { ...harness.counters }
  harness.publish(1000, () => true)
  harness.renderRow(1000)
  const delta = {}
  for (const [key, value] of Object.entries(harness.counters)) delta[key] = value - before[key]
  return delta
}

function runNormalize() {
  const raw = rawCss(SOURCE)
  const samples = []
  for (let i = 0; i < 200; i += 1) {
    const us = cpuUs(() => { for (let j = 0; j < 10; j += 1) raw.replace(/\n\s*/g, '') })
    if (i >= 10) samples.push(us / 10)
  }
  return { rawBytes: raw.length, strippedBytes: raw.replace(/\n\s*/g, '').length, ...stats(samples) }
}

const report = { variant }
if (only === 'all' || only === 'normalize') report.normalize = runNormalize()
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
