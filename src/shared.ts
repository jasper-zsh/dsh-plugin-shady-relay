export const SETTINGS_NAMESPACE = 'shady-relay'
export const DEFAULT_PROVIDER = 'shady-relay'
export const DEFAULT_DISPLAY_NAME = 'Shady Relay'

/** One selectable alias and the existing Harness route it delegates to. */
export interface VirtualModelConfig {
  /** Model id shown under the virtual provider and used in request headers. */
  id: string
  /** Optional selector label. Defaults to id. */
  name?: string
  /** Optional selector detail. */
  description?: string
  /** Existing Harness provider route that handles the real request. */
  targetProvider: string
  /** Existing Harness model id sent to targetProvider. */
  targetModel: string
  /** Text inserted before the request's assembled system prompt. */
  systemPrompt: string
}

/** Plugin composition base plus the user-owned GUI settings layer. */
export interface Config {
  /** Provider route that owns all virtual models. */
  provider?: string
  /** Human-readable provider label. */
  displayName?: string
  /** Selectable virtual models. */
  models?: VirtualModelConfig[]
}
