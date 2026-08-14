import type { Context } from '@deepseek-ai/cordis'
import {
  LlmAdapter,
  LlmError,
  type GenerateOptions,
  type LlmConfigurableProvider,
  type LlmModelInfo,
  type LlmResolvedModelInfo,
  type LlmProviderInfo,
  type LlmRuntime,
  type StreamChunk,
} from '@deepseek-ai/dsh-llm'
import { deepEqualJson, settingsNamespace } from '@deepseek-ai/dsh-settings'
import z from '@deepseek-ai/schemastery'
import {
  DEFAULT_DISPLAY_NAME,
  DEFAULT_PROVIDER,
  SETTINGS_NAMESPACE,
  type Config as RelayConfig,
  type VirtualModelConfig,
} from './shared'

export { DEFAULT_DISPLAY_NAME, DEFAULT_PROVIDER, SETTINGS_NAMESPACE }
export type Config = RelayConfig
export type { VirtualModelConfig } from './shared'

export const name = 'shady-relay'
export const inject = ['llm', 'settings']

const NS = settingsNamespace(SETTINGS_NAMESPACE)

const virtualModelSchema = z.object({
  id: z.string().min(1).required().description('Virtual model id shown by DSH.'),
  name: z.string().min(1).description('Optional virtual model display name.'),
  description: z.string().min(1).description('Optional selector description.'),
  targetProvider: z.string().min(1).required().description('Existing Harness provider route.'),
  targetModel: z.string().min(1).required().description('Existing Harness model id.'),
  systemPrompt: z.string().min(1).required().role('textarea').description('Fixed text prepended to every system prompt.'),
})

export const Config: z<RelayConfig> = z.object({
  provider: z.string().min(1).default(DEFAULT_PROVIDER).description('Provider route for the virtual models.'),
  displayName: z.string().min(1).default(DEFAULT_DISPLAY_NAME).description('Provider label shown in model selectors.'),
  models: z.array(virtualModelSchema).default([]).description('Virtual model aliases and their real targets.'),
})

export interface ResolvedVirtualModel {
  readonly id: string
  readonly name?: string
  readonly description?: string
  readonly targetProvider: string
  readonly targetModel: string
  readonly systemPrompt: string
}

export interface ResolvedConfig {
  readonly provider: string
  readonly displayName: string
  readonly models: readonly ResolvedVirtualModel[]
}

type RelayRuntime = Pick<LlmRuntime, 'resolveModelInfo' | 'stream'>
type ConfigSource = ResolvedConfig | (() => ResolvedConfig)

function requiredRoutePart(value: string | undefined, field: string): string {
  const normalized = value?.trim()
  if (!normalized) throw new Error(`shady-relay: ${field} must be a non-empty string`)
  return normalized
}

function optionalLabel(value: string | undefined, field: string): string | undefined {
  if (value === undefined) return undefined
  const normalized = value.trim()
  if (!normalized) throw new Error(`shady-relay: ${field} must be non-empty when provided`)
  return normalized
}

/** Validate and detach configuration before it becomes request-visible. */
export function resolveConfig(config: RelayConfig): ResolvedConfig {
  const provider = requiredRoutePart(config.provider ?? DEFAULT_PROVIDER, 'provider')
  const displayName = requiredRoutePart(config.displayName ?? DEFAULT_DISPLAY_NAME, 'displayName')
  const ids = new Set<string>()
  const models = (config.models ?? []).map((source, index): ResolvedVirtualModel => {
    const label = `models[${index}]`
    const id = requiredRoutePart(source.id, `${label}.id`)
    const targetProvider = requiredRoutePart(source.targetProvider, `${label}.targetProvider`)
    const targetModel = requiredRoutePart(source.targetModel, `${label}.targetModel`)

    if (ids.has(id)) throw new Error(`shady-relay: duplicate virtual model id "${id}"`)
    ids.add(id)
    if (targetProvider === provider) {
      throw new Error(
        `shady-relay: virtual model "${id}" targets its own provider "${provider}", which would recurse forever`,
      )
    }
    if (typeof source.systemPrompt !== 'string' || source.systemPrompt.trim().length === 0) {
      throw new Error(`shady-relay: ${label}.systemPrompt must contain non-whitespace text`)
    }

    const modelName = optionalLabel(source.name, `${label}.name`)
    const description = optionalLabel(source.description, `${label}.description`)
    return Object.freeze({
      id,
      ...(modelName === undefined ? {} : { name: modelName }),
      ...(description === undefined ? {} : { description }),
      targetProvider,
      targetModel,
      // Prompt whitespace is user-authored and intentionally preserved byte-for-byte.
      systemPrompt: source.systemPrompt,
    })
  })

  return Object.freeze({ provider, displayName, models: Object.freeze(models) })
}

/** Put configured text at byte zero and keep the assembled prompt after a blank line. */
export function prependSystemPrompt(prefix: string, system: string | undefined): string {
  return system === undefined || system.length === 0 ? prefix : `${prefix}\n\n${system}`
}

/** Adapter that exposes aliases while delegating transport to another registered adapter. */
export class ShadyRelayAdapter extends LlmAdapter {
  private readonly readConfig: () => ResolvedConfig

  constructor(
    private readonly runtime: RelayRuntime,
    config: ConfigSource,
  ) {
    super()
    this.readConfig = typeof config === 'function' ? config : () => config
  }

  providerInfo(provider: string): LlmProviderInfo {
    const config = this.configFor(provider)
    return { id: config.provider, name: config.displayName }
  }

  async listModels(provider: string): Promise<readonly LlmModelInfo[]> {
    const config = this.configFor(provider)
    return config.models.map((model) => ({
      provider: config.provider,
      id: model.id,
      name: model.name ?? model.id,
      ...(model.description === undefined ? {} : { description: model.description }),
    }))
  }

  async resolveModel(
    provider: string,
    model: string,
    signal?: AbortSignal,
  ): Promise<LlmResolvedModelInfo> {
    const config = this.configFor(provider)
    const route = this.model(config, model)
    const target = await this.runtime.resolveModelInfo(route.targetProvider, route.targetModel, signal)
    return {
      ...target,
      provider: config.provider,
      id: route.id,
      name: route.name ?? target.name,
      ...(route.description === undefined ? {} : { description: route.description }),
    }
  }

  stream(options: GenerateOptions): AsyncIterable<StreamChunk> {
    const config = this.configFor(options.provider)
    const route = this.model(config, options.model)
    return this.runtime.stream({
      ...options,
      provider: route.targetProvider,
      model: route.targetModel,
      system: prependSystemPrompt(route.systemPrompt, options.system),
    })
  }

  private configFor(provider: string): ResolvedConfig {
    const config = this.readConfig()
    if (provider !== config.provider) {
      throw new LlmError(
        `shady-relay adapter for "${config.provider}" cannot serve provider "${provider}"`,
        'SHADY_RELAY_INVALID_PROVIDER',
      )
    }
    return config
  }

  private model(config: ResolvedConfig, id: string): ResolvedVirtualModel {
    const route = config.models.find((entry) => entry.id === id)
    if (route === undefined) {
      throw new LlmError(
        `shady-relay: virtual model "${id}" is not configured under provider "${config.provider}"`,
        'SHADY_RELAY_MODEL_NOT_FOUND',
      )
    }
    return route
  }
}

function directoryEntry(config: ResolvedConfig): LlmConfigurableProvider {
  return {
    provider: config.provider,
    displayName: config.displayName,
    settingsNs: SETTINGS_NAMESPACE,
    settingsPath: [],
    declared: false,
  }
}

/** Reject a GUI write that would steal another adapter or directory route. */
function assertTopologyAvailable(ctx: Context, candidate: ResolvedConfig, active: ResolvedConfig): void {
  if (
    candidate.provider !== active.provider
    && ctx.llm.listProviders().some((entry) => entry.id === candidate.provider)
  ) {
    throw new Error(`shady-relay: provider route "${candidate.provider}" is already registered`)
  }
  if (
    candidate.provider !== active.provider
    && ctx.llm.listConfigurableProviders().some((entry) => entry.provider === candidate.provider)
  ) {
    throw new Error(`shady-relay: configurable provider route "${candidate.provider}" is already declared`)
  }
}

/** Register the live settings namespace, virtual route, and GUI exposure directory. */
export function apply(ctx: Context, config: RelayConfig): void {
  let active: ResolvedConfig | undefined
  let pending: ResolvedConfig | undefined

  const settings = ctx.settings.register(NS, Config, {
    base: config,
    applies: 'live',
    validate(value) {
      const candidate = resolveConfig(value)
      if (active !== undefined) assertTopologyAvailable(ctx, candidate, active)
    },
  })

  active = resolveConfig(settings.get())
  const adapter = new ShadyRelayAdapter(ctx.llm, () => pending ?? active!)
  const registration = ctx.llm.registerAdapter([active.provider], adapter)
  const directory = ctx.llm.registerConfigurableProviders([directoryEntry(active)])

  const activate = (nextRaw: RelayConfig) => {
    const next = resolveConfig(nextRaw)
    if (deepEqualJson(active, next)) return
    assertTopologyAvailable(ctx, next, active!)

    const previous = active!
    let routeSwitched = false
    pending = next
    try {
      registration.replace([next.provider])
      routeSwitched = true
      try {
        directory.replace([directoryEntry(next)])
      } catch (error) {
        pending = previous
        registration.replace([previous.provider])
        throw error
      }
      active = next
    } catch (error) {
      if (routeSwitched) ctx.logger.warn('shady-relay: rolled back a rejected GUI topology update')
      throw error
    } finally {
      pending = undefined
    }
  }

  ctx.effect(() => settings.watch((next) => {
    try {
      activate(next)
    } catch (error) {
      ctx.logger.error('shady-relay: keeping the last working virtual-model configuration')
      ctx.logger.error(error)
    }
  }))
}
