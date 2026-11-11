import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import { Config } from '../lib/index.js'

const require = createRequire(import.meta.url)
let client
runInNewContext(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'), {
  window: { __ModuleLoader__: { load: ({ factory }) => { client = factory(require) } } },
})

const model = {
  id: 'alias',
  targetProvider: 'real',
  targetModel: 'model',
  systemPrompt: '  Preserve this prefix.\n\n',
}

function harness(value = Config({ models: [model] }).get()) {
  const schema = JSON.parse(JSON.stringify(Config.toJSON()))
  // DSH's wire descriptor excludes executable callbacks (observed in rc2).
  for (const ref of Object.values(schema.refs)) {
    delete ref.callback
    if (ref.meta) delete ref.meta.volatile
  }
  let namespace = {
    ns: 'shady-relay', schema, value, base: Config({}).get(),
    user: { models: [model] }, revision: 0, applies: 'live', secrets: [],
  }
  let mirrored = { status: 'ready', view: { namespaces: [namespace], writable: true, hasDocument: true }, error: null }
  const listeners = new Set()
  const calls = []
  const mirror = {
    getSnapshot: () => mirrored,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn) },
    ensure: async () => {},
    acceptView(view) {
      namespace = view
      mirrored = { ...mirrored, view: { ...mirrored.view, namespaces: [view] } }
      for (const fn of listeners) fn()
    },
  }
  const raw = {
    // The framework's generic form stays loading when the transform is decoded.
    getSnapshot: () => ({ status: 'loading', value: undefined, base: namespace.base, user: namespace.user, revision: namespace.revision, writable: true }),
    subscribe: (fn) => mirror.subscribe(fn),
    async mutate(ops, expectedRevision) {
      calls.push({ ops, expectedRevision })
      const models = ops[0].op === 'unset' ? [] : ops[0].value
      const accepted = Config({ ...namespace.value, models }).get()
      mirror.acceptView({ ...namespace, value: accepted, user: ops[0].op === 'unset' ? {} : { models }, revision: namespace.revision + 1 })
      return true
    },
    set(field, value) { return this.mutate([{ op: 'set', path: [field], value }]) },
    unset(field) { return this.mutate([{ op: 'unset', path: [field] }]) },
  }
  let element
  client.apply({
    configForms: { get: (namespace) => { assert.equal(namespace, 'shady-relay'); return raw }, describe: () => mirror },
    remote: { session: { modelCatalog: async () => ({ ok: true, value: { groups: [] } }) } },
    effect() {},
    slots: { inject(_slot, fn) { fn() }, register(_meta, render) { element = render() } },
  })
  return {
    scope: element.props.scope, raw, mirror, calls,
    get namespace() { return namespace },
    setSnapshot(next) { mirrored = next; for (const fn of listeners) fn() },
    get mirrorSnapshot() { return mirrored },
  }
}

test('settings page accepts a Host-resolved transform config instead of staying loading', () => {
  const { scope, raw } = harness()
  assert.equal(raw.getSnapshot().status, 'loading')
  assert.equal(scope.getSnapshot().status, 'ready')
  assert.equal(scope.getSnapshot().value.models[0].systemPrompt, model.systemPrompt)
  assert.equal(scope.getSnapshot().writable, true)
  assert.equal(scope.getSnapshot(), scope.getSnapshot(), 'external-store snapshot must have stable identity')
})

test('empty configuration becomes ready without inventing model mappings', () => {
  const { scope } = harness(Config({}).get())
  assert.equal(scope.getSnapshot().status, 'ready')
  assert.deepEqual(scope.getSnapshot().value.models, [])
})

test('malformed Host values fail closed instead of displaying an endless spinner', () => {
  const valid = Config({ models: [model] }).get()
  for (const value of [null, [], {}, { ...valid, models: null },
    { ...valid, provider: 4 }, { ...valid, displayName: ' ' },
    { ...valid, models: [null] }, { ...valid, models: [{ ...model, systemPrompt: 4 }] },
    { ...valid, models: [{ ...model, targetModel: '' }] },
    { ...valid, models: [{ ...model, name: [] }] },
    { ...valid, models: [{ ...model, description: {} }] }]) {
    const snapshot = harness(value).scope.getSnapshot()
    assert.equal(snapshot.status, 'unavailable')
    assert.equal(snapshot.writable, false)
    assert.equal(snapshot.value, undefined)
    assert.match(snapshot.error, /格式无效/)
  }
})

test('initial load, missing namespace and transport failures have distinct states', () => {
  const h = harness()
  h.setSnapshot({ status: 'loading', view: undefined, error: null })
  assert.equal(h.scope.getSnapshot().status, 'loading')
  h.setSnapshot({ status: 'idle', view: undefined, error: 'Disconnected' })
  assert.equal(h.scope.getSnapshot().status, 'unavailable')
  assert.equal(h.scope.getSnapshot().error, 'Disconnected')
  h.setSnapshot({ status: 'ready', view: { namespaces: [], writable: true }, error: null })
  assert.equal(h.scope.getSnapshot().status, 'unavailable')
  assert.match(h.scope.getSnapshot().error, /未向 GUI 暴露/)
})

test('save and reset keep Host validation, acceptance and revision readback', async () => {
  const h = harness()
  const replacement = { ...model, id: 'second', systemPrompt: '\nnew prefix  ' }
  assert.equal(await h.scope.set('models', [replacement]), true)
  assert.equal(h.scope.getSnapshot().status, 'ready')
  assert.equal(h.scope.getSnapshot().revision, 1)
  assert.deepEqual(h.scope.getSnapshot().value.models, [replacement])
  await assert.rejects(h.scope.set('models', [replacement, replacement]), /duplicate/)
  assert.equal(h.scope.getSnapshot().revision, 1)
  assert.deepEqual(h.scope.getSnapshot().value.models, [replacement])
  assert.equal(await h.scope.unset('models'), true)
  assert.equal(h.scope.getSnapshot().revision, 2)
  assert.deepEqual(h.scope.getSnapshot().value.models, [])
  assert.deepEqual(h.scope.getSnapshot().user, {})
})

test('write refusal is forwarded instead of converted into acceptance', async () => {
  const h = harness()
  h.raw.set = async () => false
  assert.equal(await h.scope.set('models', []), false)
  assert.deepEqual(h.scope.getSnapshot().value.models, [model])
})

test('atomic writes forward an explicit revision fence unchanged', async () => {
  const h = harness()
  const ops = [{ op: 'set', path: ['models'], value: [model] }]
  assert.equal(await h.scope.mutate(ops, 41), true)
  assert.equal(h.calls[0].expectedRevision, 41)
  assert.equal(h.calls[0].ops, ops)
})

test('mirror subscriptions update the form and unsubscribe cleanly', () => {
  const h = harness()
  let updates = 0
  const before = h.scope.getSnapshot()
  const off = h.scope.subscribe(() => updates++)
  h.mirror.acceptView({ ...h.namespace, value: Config({}).get(), revision: 3 })
  const after = h.scope.getSnapshot()
  assert.equal(updates, 1)
  assert.notEqual(before, after)
  assert.equal(after.revision, 3)
  assert.equal(after, h.scope.getSnapshot())
  off()
  h.mirror.acceptView({ ...h.namespace, revision: 4 })
  assert.equal(updates, 1)
})

test('read-only Host state disables editing without losing readable values', () => {
  const h = harness()
  h.setSnapshot({ ...h.mirrorSnapshot, view: { ...h.mirrorSnapshot.view, writable: false } })
  assert.equal(h.scope.getSnapshot().status, 'ready')
  assert.equal(h.scope.getSnapshot().writable, false)
  assert.equal(h.scope.getSnapshot().value.models[0].id, model.id)
})
