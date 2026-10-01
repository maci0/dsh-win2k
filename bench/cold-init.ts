/**
 * One cold sample: CPU microseconds this fresh process spends importing
 * `lib/client.js` and mounting it, printed to stdout. Driven by
 * `coldInitSampleUs()` in `harness.ts`; a module evaluates once per process,
 * so each sample is its own process.
 */

import { loadBundle, mount } from './harness.ts'

const before = process.cpuUsage()
mount(await loadBundle(), { status: 'ready', value: { selected: false }, writable: true })
const after = process.cpuUsage(before)
console.log(after.user + after.system)
