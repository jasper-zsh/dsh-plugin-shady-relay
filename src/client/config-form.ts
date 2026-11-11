import type {
  ConfigForm,
  ConfigForms,
  ConfigFormSnapshot,
  SettingsMirrorSnapshot,
} from '@deepseek-ai/dsh-client-ui-settings/client'
import { SETTINGS_NAMESPACE, type Config } from '../shared'

export type RelayFormSnapshot = ConfigFormSnapshot<Config> & { error?: string }
export type RelayForm = Omit<ConfigForm<Config>, 'getSnapshot'> & {
  getSnapshot(): RelayFormSnapshot
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Narrow Host-resolved JSON without executing callbacks from a wire schema. */
function decodeConfig(value: unknown): Config | undefined {
  if (!isRecord(value) || !isText(value.provider) || !isText(value.displayName)
    || !Array.isArray(value.models)) return undefined
  if (!value.models.every((model: unknown) => isRecord(model)
    && isText(model.id) && isText(model.targetProvider) && isText(model.targetModel)
    && isText(model.systemPrompt)
    && (model.name === undefined || isText(model.name))
    && (model.description === undefined || isText(model.description)))) return undefined
  return value as Config
}

/**
 * rc2 omits transform callbacks from schema descriptors. Its generic form then
 * stays loading even though the shared describe mirror contains a valid value.
 * Read that public mirror with a domain decoder; retain the framework's write
 * queue, revision fencing, recovery and all Host-side semantic validation.
 */
export function createRelayForm(forms: Pick<ConfigForms, 'get' | 'describe'>): RelayForm {
  const writes = forms.get<Config>(SETTINGS_NAMESPACE)
  const mirror = forms.describe()
  let previous: SettingsMirrorSnapshot | undefined
  let snapshot: RelayFormSnapshot

  return {
    getSnapshot() {
      const current = mirror.getSnapshot()
      if (current === previous) return snapshot
      previous = current
      const view = current.view?.namespaces.find((row) => row.ns === SETTINGS_NAMESPACE)
      const value = decodeConfig(view?.value)
      const error = current.view === undefined
        ? current.error ?? undefined
        : view === undefined
          ? '当前 Host 未向 GUI 暴露 shady-relay 设置。'
          : value === undefined
            ? 'Host 返回的虚拟模型设置格式无效。'
            : undefined
      snapshot = {
        status: value !== undefined ? 'ready' : error ? 'unavailable' : 'loading',
        value,
        base: view?.base,
        user: view?.user,
        revision: view?.revision,
        writable: value !== undefined && current.view?.writable === true,
        ...(error ? { error } : {}),
      }
      return snapshot
    },
    subscribe: (listener) => mirror.subscribe(listener),
    set: (field, value) => writes.set(field, value),
    unset: (field) => writes.unset(field),
    mutate: (ops, expectedRevision) => writes.mutate(ops, expectedRevision),
  }
}
