import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ShadyRelayAdapter,
  prependSystemPrompt,
  resolveConfig,
} from '../lib/index.js'

test('prepends configured text before the assembled system prompt', () => {
  assert.equal(prependSystemPrompt('fixed', undefined), 'fixed')
  assert.equal(prependSystemPrompt('fixed', ''), 'fixed')
  assert.equal(prependSystemPrompt('fixed', 'assembled'), 'fixed\n\nassembled')
})

test('rejects duplicate aliases and direct recursion', () => {
  const route = {
    id: 'reviewer',
    targetProvider: 'openai',
    targetModel: 'gpt-test',
    systemPrompt: 'Review carefully.',
  }

  assert.throws(
    () => resolveConfig({ models: [route, route] }),
    /duplicate virtual model id/,
  )
  assert.throws(
    () => resolveConfig({ provider: 'relay', models: [{ ...route, targetProvider: 'relay' }] }),
    /recurse forever/,
  )
})

test('mirrors target capabilities and forwards a copied request', async () => {
  const calls = []
  const runtime = {
    async resolveModelInfo(provider, model) {
      assert.equal(provider, 'openai')
      assert.equal(model, 'gpt-test')
      return {
        provider,
        id: model,
        name: 'Target model',
        description: 'Target description',
        inputModalities: ['text', 'image'],
        context: { contextWindow: 123456 },
        defaultMaxTokens: 4096,
        reasoning: {
          efforts: [{ id: 'high', name: 'High' }],
          defaultEffort: 'high',
        },
      }
    },
    stream(options) {
      calls.push(options)
      return (async function* () {
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  }

  const resolved = resolveConfig({
    provider: 'relay',
    displayName: 'Relay models',
    models: [{
      id: 'reviewer',
      name: 'Strict reviewer',
      description: 'Reviews before answering',
      targetProvider: 'openai',
      targetModel: 'gpt-test',
      systemPrompt: 'Always review the answer first.',
    }],
  })
  const adapter = new ShadyRelayAdapter(runtime, resolved)

  assert.deepEqual(adapter.providerInfo('relay'), { id: 'relay', name: 'Relay models' })
  assert.deepEqual(await adapter.listModels('relay'), [{
    provider: 'relay',
    id: 'reviewer',
    name: 'Strict reviewer',
    description: 'Reviews before answering',
    inputModalities: ['text', 'image'],
  }])

  const info = await adapter.resolveModel('relay', 'reviewer')
  assert.equal(info.provider, 'relay')
  assert.equal(info.id, 'reviewer')
  assert.equal(info.name, 'Strict reviewer')
  assert.equal(info.description, 'Reviews before answering')
  assert.deepEqual(info.context, { contextWindow: 123456 })
  assert.deepEqual(info.inputModalities, ['text', 'image'])
  assert.equal(info.defaultMaxTokens, 4096)
  assert.equal(info.reasoning.defaultEffort, 'high')

  const original = {
    provider: 'relay',
    model: 'reviewer',
    messages: [],
    system: 'Harness prompt',
    temperature: 0.2,
  }
  const chunks = []
  for await (const chunk of adapter.stream(original)) chunks.push(chunk)

  assert.deepEqual(chunks, [{ type: 'finish', reason: { kind: 'stop' } }])
  assert.equal(calls.length, 1)
  assert.notEqual(calls[0], original)
  assert.equal(calls[0].provider, 'openai')
  assert.equal(calls[0].model, 'gpt-test')
  assert.equal(calls[0].system, 'Always review the answer first.\n\nHarness prompt')
  assert.equal(calls[0].temperature, 0.2)
  assert.equal(original.system, 'Harness prompt')
})

test('prepareCall captures one alias generation across live settings changes', async () => {
  let active = resolveConfig({
    provider: 'relay',
    models: [{
      id: 'reviewer',
      targetProvider: 'openai',
      targetModel: 'model-a',
      systemPrompt: 'First prefix',
    }],
  })
  const calls = []
  const runtime = {
    async resolveModelInfo(provider, model) {
      return {
        provider,
        id: model,
        name: model,
        inputModalities: ['text', 'image'],
      }
    },
    stream(options) {
      calls.push(options)
      return (async function* () {
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  }
  const adapter = new ShadyRelayAdapter(runtime, () => active)
  const prepared = await adapter.prepareCall('relay', 'reviewer')

  assert.equal(typeof adapter.prepareCall, 'function')
  assert.equal(prepared.model.provider, 'relay')
  assert.equal(prepared.model.id, 'reviewer')
  assert.deepEqual(prepared.model.inputModalities, ['text', 'image'])

  active = resolveConfig({
    provider: 'relay',
    models: [{
      id: 'reviewer',
      targetProvider: 'deepseek-official',
      targetModel: 'model-b',
      systemPrompt: 'Second prefix',
    }],
  })

  for await (const _chunk of prepared.stream({
    provider: 'relay',
    model: 'reviewer',
    messages: [],
    system: 'Harness prompt',
  })) {
    // consume
  }

  assert.equal(calls.length, 1)
  assert.equal(calls[0].provider, 'openai')
  assert.equal(calls[0].model, 'model-a')
  assert.equal(calls[0].system, 'First prefix\n\nHarness prompt')
})

test('reads live settings for later catalog and request calls', async () => {
  let active = resolveConfig({
    provider: 'relay',
    models: [{
      id: 'first',
      targetProvider: 'openai',
      targetModel: 'model-a',
      systemPrompt: 'First prefix',
    }],
  })
  const calls = []
  const runtime = {
    async resolveModelInfo(provider, model) {
      return { provider, id: model, name: model }
    },
    stream(options) {
      calls.push(options)
      return (async function* () {
        yield { type: 'finish', reason: { kind: 'stop' } }
      })()
    },
  }
  const adapter = new ShadyRelayAdapter(runtime, () => active)

  assert.deepEqual((await adapter.listModels('relay')).map((model) => model.id), ['first'])
  active = resolveConfig({
    provider: 'relay',
    models: [{
      id: 'second',
      targetProvider: 'deepseek-official',
      targetModel: 'model-b',
      systemPrompt: 'Second prefix',
    }],
  })
  assert.deepEqual((await adapter.listModels('relay')).map((model) => model.id), ['second'])

  for await (const _chunk of adapter.stream({ provider: 'relay', model: 'second', messages: [] })) {
    // consume
  }
  assert.equal(calls[0].provider, 'deepseek-official')
  assert.equal(calls[0].model, 'model-b')
  assert.equal(calls[0].system, 'Second prefix')
})
