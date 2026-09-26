/**
 * Real-composition test: the host half mounts into a real `@deepseek-ai/cordis`
 * `Context` through its exported `Config`.
 *
 * The host half registers nothing — its whole job is the settings row the
 * browser cube writes — so the thing worth proving is that the row resolves at
 * mount and that its one field is writable by the settings document. A schema
 * that stopped serving a volatile field would leave the cube switching a flag
 * nothing persists, which no unit test of the client half can see.
 *
 * @module dsh-win2k/composition
 */

import assert from 'node:assert/strict'
import test from 'node:test'

import { Context } from '@deepseek-ai/cordis'
import { createVolatile, updateVolatile } from '@deepseek-ai/cosmokit'

import * as Win2k from '../lib/index.js'

test('the host half mounts into a real Cordis context with a writable row', async () => {
  const ctx = new Context()
  const fiber = await ctx.plugin(Win2k, { selected: true })

  assert.equal(Win2k.WIN2K_SETTINGS_NAMESPACE, 'win2k')
  const selected = fiber.config.selected
  assert.equal(typeof selected.get, 'function', 'selected is volatile, so the document can persist it')
  assert.equal(selected.get(), true)

  // The cube's write path: a settings write moves the live reference.
  updateVolatile(selected, createVolatile(false))
  assert.equal(selected.get(), false, 'the row follows the document')

  await fiber.dispose()
})
