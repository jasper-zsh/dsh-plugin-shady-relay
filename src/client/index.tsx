import type { Context } from '@deepseek-ai/cordis'
import type { ConnectionHandle, ModelProviderGroup } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import React from 'react'
import {
  DEFAULT_PROVIDER,
  SETTINGS_NAMESPACE,
  type Config,
  type VirtualModelConfig,
} from '../shared'
import { CSS } from './styles'

export const inject = ['slots', 'settingsScope', 'connection', 'remote']

type RelayScope = SettingsScope<Config>

interface DraftModel {
  id: string
  name: string
  description: string
  targetProvider: string
  targetModel: string
  systemPrompt: string
}

const EMPTY_DRAFT: DraftModel = {
  id: '',
  name: '',
  description: '',
  targetProvider: '',
  targetModel: '',
  systemPrompt: '',
}

function toDrafts(models: readonly VirtualModelConfig[] | undefined): DraftModel[] {
  return (models ?? []).map((model) => ({
    id: model.id,
    name: model.name ?? '',
    description: model.description ?? '',
    targetProvider: model.targetProvider,
    targetModel: model.targetModel,
    systemPrompt: model.systemPrompt,
  }))
}

function validateDrafts(drafts: readonly DraftModel[], provider: string): string | undefined {
  const ids = new Set<string>()
  for (const [index, draft] of drafts.entries()) {
    const row = `第 ${index + 1} 个映射`
    const id = draft.id.trim()
    if (!id) return `${row}缺少虚拟模型 ID。`
    if (ids.has(id)) return `虚拟模型 ID “${id}” 重复。`
    ids.add(id)
    if (!draft.targetProvider.trim()) return `${row}缺少目标 Provider。`
    if (!draft.targetModel.trim()) return `${row}缺少目标模型。`
    if (draft.targetProvider.trim() === provider) return `${row}不能指回虚拟 Provider 自身。`
    if (!draft.systemPrompt.trim()) return `${row}缺少固定 System Prompt。`
  }
}

function toModels(drafts: readonly DraftModel[]): VirtualModelConfig[] {
  return drafts.map((draft) => {
    const name = draft.name.trim()
    const description = draft.description.trim()
    return {
      id: draft.id.trim(),
      ...(name ? { name } : {}),
      ...(description ? { description } : {}),
      targetProvider: draft.targetProvider.trim(),
      targetModel: draft.targetModel.trim(),
      systemPrompt: draft.systemPrompt,
    }
  })
}

function sameModels(
  left: readonly VirtualModelConfig[] | undefined,
  right: readonly VirtualModelConfig[],
): boolean {
  return JSON.stringify(toModels(toDrafts(left))) === JSON.stringify(right)
}

function RelaySettingsPage({ scope, connection }: { scope: RelayScope; connection: ConnectionHandle }) {
  const snapshot = React.useSyncExternalStore(
    (listener) => scope.subscribe(listener),
    () => scope.getSnapshot(),
    () => scope.getSnapshot(),
  )
  const provider = snapshot.value?.provider ?? DEFAULT_PROVIDER
  const [drafts, setDrafts] = React.useState<DraftModel[]>([])
  const [dirty, setDirty] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [message, setMessage] = React.useState<{ kind: 'error' | 'success'; text: string } | null>(null)
  const [catalog, setCatalog] = React.useState<ModelProviderGroup[]>([])
  const [catalogError, setCatalogError] = React.useState<string | null>(null)
  const listId = React.useId().replace(/:/g, '')

  React.useEffect(() => {
    if (snapshot.status === 'ready' && !dirty) setDrafts(toDrafts(snapshot.value?.models))
  }, [snapshot.status, snapshot.revision, snapshot.value, dirty])

  React.useEffect(() => {
    let active = true
    connection.api.llm.models({}).then((response) => {
      if (!active) return
      if (!response.result.ok) {
        setCatalogError(response.result.error.message)
        return
      }
      setCatalog(response.result.value.groups.filter((group) => group.id !== provider))
      setCatalogError(null)
    }).catch((error) => {
      if (active) setCatalogError(error instanceof Error ? error.message : String(error))
    })
    return () => { active = false }
  }, [connection, provider, snapshot.revision])

  const edit = (index: number, field: keyof DraftModel, value: string) => {
    setDrafts((current) => current.map((draft, at) => at === index ? { ...draft, [field]: value } : draft))
    setDirty(true)
    setMessage(null)
  }

  const save = async () => {
    const failure = validateDrafts(drafts, provider)
    if (failure) {
      setMessage({ kind: 'error', text: failure })
      return
    }
    const desired = toModels(drafts)
    setSaving(true)
    setMessage(null)
    try {
      await scope.set('models', desired)
      const accepted = scope.getSnapshot()
      if (accepted.status !== 'ready' || !sameModels(accepted.value?.models, desired)) {
        throw new Error('Host 未接受本次保存（可能发生了并发修改）。表单内容已保留，请重试。')
      }
      setDrafts(toDrafts(accepted.value?.models))
      setDirty(false)
      setMessage({ kind: 'success', text: '模型映射已保存，并已对后续请求生效。' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setSaving(false)
    }
  }

  const reset = async () => {
    setSaving(true)
    setMessage(null)
    try {
      await scope.unset('models')
      const accepted = scope.getSnapshot()
      const user = accepted.user
      const stillOverridden = typeof user === 'object'
        && user !== null
        && Object.prototype.hasOwnProperty.call(user, 'models')
      if (accepted.status !== 'ready' || stillOverridden) {
        throw new Error('Host 未接受恢复操作（可能发生了并发修改）。请重试。')
      }
      setDrafts(toDrafts(accepted.value?.models))
      setDirty(false)
      setMessage({ kind: 'success', text: '已恢复到 profile 中声明的模型映射。' })
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : String(error) })
    } finally {
      setSaving(false)
    }
  }

  if (snapshot.status === 'loading') return <div className="shadyRelayPage">正在加载虚拟模型设置…</div>
  if (snapshot.status === 'unavailable') {
    return <div className="shadyRelayPage"><div className="shadyRelayStatus shadyRelayStatusError">当前 Host 未向 GUI 暴露 shady-relay 设置。</div></div>
  }

  const disabled = saving || !snapshot.writable
  return <div className="shadyRelayPage">
    <div className="shadyRelayHeader">
      <div className="shadyRelayHeaderCopy">
        <h2 className="shadyRelayTitle">虚拟模型映射</h2>
        <p className="shadyRelayHint">为每个虚拟模型选择 Harness 中已配置的真实模型，并设置固定 System Prompt 前缀。</p>
        <div className="shadyRelayMeta">虚拟 Provider：<code>{provider}</code> · {snapshot.writable ? '可写' : '只读'}</div>
      </div>
      <div className="shadyRelayToolbar">
        <button className="shadyRelayButton" disabled={disabled} onClick={() => {
          setDrafts((current) => [...current, { ...EMPTY_DRAFT }])
          setDirty(true)
          setMessage(null)
        }}>添加映射</button>
      </div>
    </div>

    <datalist id={`${listId}-providers`}>
      {catalog.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
    </datalist>
    {catalogError && <div className="shadyRelayStatus shadyRelayStatusError">读取模型目录失败：{catalogError}；仍可手工输入路由。</div>}

    {drafts.length === 0
      ? <div className="shadyRelayEmpty">还没有模型映射。点击“添加映射”开始配置。</div>
      : drafts.map((draft, index) => {
        const models = catalog.find((group) => group.id === draft.targetProvider)?.models ?? []
        const modelListId = `${listId}-models-${index}`
        return <div className="shadyRelayCard" key={index}>
          <div className="shadyRelayCardHeader">
            <div className="shadyRelayCardTitle">{draft.name.trim() || draft.id.trim() || `映射 ${index + 1}`}</div>
            <button className="shadyRelayButton shadyRelayButtonDanger" disabled={disabled} onClick={() => {
              setDrafts((current) => current.filter((_entry, at) => at !== index))
              setDirty(true)
              setMessage(null)
            }}>删除</button>
          </div>
          <div className="shadyRelayGrid">
            <label className="shadyRelayField">
              <span className="shadyRelayLabel">虚拟模型 ID *</span>
              <input className="shadyRelayInput" value={draft.id} disabled={disabled} placeholder="strict-reviewer" onChange={(event) => edit(index, 'id', event.target.value)} />
            </label>
            <label className="shadyRelayField">
              <span className="shadyRelayLabel">显示名称</span>
              <input className="shadyRelayInput" value={draft.name} disabled={disabled} placeholder="Strict Reviewer" onChange={(event) => edit(index, 'name', event.target.value)} />
            </label>
            <label className="shadyRelayField">
              <span className="shadyRelayLabel">目标 Provider *</span>
              <input className="shadyRelayInput" list={`${listId}-providers`} value={draft.targetProvider} disabled={disabled} placeholder="deepseek-official" onChange={(event) => edit(index, 'targetProvider', event.target.value)} />
            </label>
            <label className="shadyRelayField">
              <span className="shadyRelayLabel">目标模型 *</span>
              <input className="shadyRelayInput" list={modelListId} value={draft.targetModel} disabled={disabled} placeholder="deepseek-v4-flash" onChange={(event) => edit(index, 'targetModel', event.target.value)} />
              <datalist id={modelListId}>{models.map((model) => <option key={model.id} value={model.id}>{model.name}</option>)}</datalist>
            </label>
            <label className="shadyRelayField shadyRelayFieldWide">
              <span className="shadyRelayLabel">描述</span>
              <input className="shadyRelayInput" value={draft.description} disabled={disabled} placeholder="该虚拟模型的用途" onChange={(event) => edit(index, 'description', event.target.value)} />
            </label>
            <label className="shadyRelayField shadyRelayFieldWide">
              <span className="shadyRelayLabel">固定 System Prompt *</span>
              <textarea className="shadyRelayTextarea" value={draft.systemPrompt} disabled={disabled} placeholder="这段内容会出现在 Harness system prompt 的最前面。" onChange={(event) => edit(index, 'systemPrompt', event.target.value)} />
            </label>
          </div>
        </div>
      })}

    {message && <div className={`shadyRelayStatus ${message.kind === 'error' ? 'shadyRelayStatusError' : 'shadyRelayStatusSuccess'}`}>{message.text}</div>}
    <div className="shadyRelayActions">
      <button className="shadyRelayButton shadyRelayButtonPrimary" disabled={disabled || !dirty} onClick={save}>{saving ? '保存中…' : '保存映射'}</button>
      <button className="shadyRelayButton" disabled={disabled || !dirty} onClick={() => {
        setDrafts(toDrafts(snapshot.value?.models))
        setDirty(false)
        setMessage(null)
      }}>放弃修改</button>
      <button className="shadyRelayButton" disabled={disabled} onClick={reset}>恢复 Profile 配置</button>
    </div>
  </div>
}

export function apply(ctx: Context): void {
  const scope = ctx.settingsScope.bind<Config>({ namespace: SETTINGS_NAMESPACE })
  const connection = ctx.get('connection') as ConnectionHandle

  ctx.effect(() => {
    const style = document.createElement('style')
    style.setAttribute('data-dsh-plugin', 'dsh-plugin-shady-relay')
    style.textContent = CSS
    document.head.appendChild(style)
    return () => style.remove()
  })

  ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'shady-relay', order: 11, label: '虚拟模型' },
    () => <RelaySettingsPage scope={scope} connection={connection} />,
  ))
}
