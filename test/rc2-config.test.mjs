import assert from 'node:assert/strict'
import test from 'node:test'
import { Config, apply } from '../lib/index.js'

const model = { id: 'alias', targetProvider: 'real', targetModel: 'model', systemPrompt: 'prefix' }

test('rc2 Config rejects duplicate aliases before a live write commits', () => {
  assert.throws(() => Config({ models: [model, model] }), /duplicate virtual model id/)
})

test('rc2 volatile configuration updates the adapter without remounting', async () => {
  let value = Config({ models: [model] }).get()
  const ref = { get: () => value }
  const events = new Map()
  let adapter
  const routes = []
  const directories = []
  const errors = []
  const ctx = {
    settings: { configure: () => () => {} },
    effect: (fn) => fn(),
    on: (name, fn) => events.set(name, fn),
    logger: { warn() {}, error: (error) => errors.push(error) },
    llm: {
      registerAdapter(ids, instance) { adapter = instance; routes.push(ids); return { replace(ids) { routes.push(ids) } } },
      registerConfigurableProviders(entries) { directories.push(entries); return { replace(entries) { directories.push(entries) } } },
      listProviders: () => [{ id: 'real' }],
      listConfigurableProviders: () => [],
      async resolveModelInfo(provider, id) { return { provider, id, inputModalities: ['text', 'image'] } },
    },
  }
  apply(ctx, ref)
  assert.throws(() => events.get('internal/config').call(ctx.fiber, {}, () => ({ provider: 'real', models: [] })), /already registered/)
  assert.equal((await adapter.listModels('shady-relay'))[0].id, 'alias')
  value = Config({ provider: 'custom', models: [{ ...model, id: 'updated' }] }).get()
  events.get('loader/volatile-update')([[]])
  assert.equal((await adapter.listModels('custom'))[0].id, 'updated')
  assert.deepEqual(routes.at(-1), ['custom'])
  assert.equal(directories.at(-1)[0].provider, 'custom')
  assert.equal(errors.length, 0)
})
