/** DeepSeek / OpenAI / 通义千问 等多提供商 AI 配置 */

export type GenerationMode = 'public' | 'ai' | 'hybrid'
export type AiProviderId = 'deepseek' | 'openai' | 'qwen'

export interface AiModelOption {
  id: string
  label: string
  provider: AiProviderId
  note?: string
}

export interface AiProviderDefinition {
  id: AiProviderId
  name: string
  envKey: string
  envBaseUrl: string
  envModel: string
  defaultBaseUrl: string
  defaultModel: string
  docUrl: string
  models: AiModelOption[]
}

export interface AiProviderOption {
  id: AiProviderId
  name: string
  configured: boolean
  baseUrl: string
  defaultModel: string
  docUrl: string
  models: AiModelOption[]
}

export interface AiRuntimeConfig {
  providerId: AiProviderId
  apiKey: string | undefined
  baseUrl: string
  model: string
  configured: boolean
}

const MODELS: Record<AiProviderId, AiModelOption[]> = {
  deepseek: [
    { id: 'deepseek-v4-flash', label: 'V4 Flash（推荐，性价比高）', provider: 'deepseek' },
    { id: 'deepseek-v4-pro', label: 'V4 Pro（更强，适合申论）', provider: 'deepseek' },
    { id: 'deepseek-chat', label: 'deepseek-chat（旧版别名）', provider: 'deepseek', note: '2026-07 退役' },
    { id: 'deepseek-reasoner', label: 'deepseek-reasoner（旧版推理）', provider: 'deepseek', note: '2026-07 退役' },
  ],
  openai: [
    { id: 'gpt-4o-mini', label: 'gpt-4o-mini（便宜快速）', provider: 'openai' },
    { id: 'gpt-4o', label: 'gpt-4o（更强）', provider: 'openai' },
    { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini', provider: 'openai' },
  ],
  qwen: [
    { id: 'qwen-plus', label: '通义千问 Plus', provider: 'qwen' },
    { id: 'qwen-turbo', label: '通义千问 Turbo（更快）', provider: 'qwen' },
    { id: 'qwen-max', label: '通义千问 Max（更强）', provider: 'qwen' },
  ],
}

export const AI_PROVIDER_DEFINITIONS: AiProviderDefinition[] = [
  {
    id: 'deepseek',
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    envBaseUrl: 'DEEPSEEK_BASE_URL',
    envModel: 'DEEPSEEK_MODEL',
    defaultBaseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-v4-flash',
    docUrl: 'https://platform.deepseek.com/',
    models: MODELS.deepseek,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    envKey: 'OPENAI_API_KEY',
    envBaseUrl: 'OPENAI_BASE_URL',
    envModel: 'OPENAI_MODEL',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    docUrl: 'https://platform.openai.com/',
    models: MODELS.openai,
  },
  {
    id: 'qwen',
    name: '通义千问',
    envKey: 'QWEN_API_KEY',
    envBaseUrl: 'QWEN_BASE_URL',
    envModel: 'QWEN_MODEL',
    defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'qwen-plus',
    docUrl: 'https://dashscope.aliyun.com/',
    models: MODELS.qwen,
  },
]

function readEnv(key: string): string | undefined {
  const v = process.env[key]?.trim()
  return v || undefined
}

/** 兼容旧版单一 AI_API_KEY（视为 DeepSeek） */
function resolveProviderKey(def: AiProviderDefinition): string | undefined {
  const key = readEnv(def.envKey)
  if (key) return key
  if (def.id === 'deepseek') {
    return readEnv('AI_API_KEY')
  }
  return undefined
}

function resolveProviderBaseUrl(def: AiProviderDefinition): string {
  const custom = readEnv(def.envBaseUrl)
  if (custom) return custom
  if (def.id === 'deepseek' && readEnv('AI_BASE_URL')) {
    return readEnv('AI_BASE_URL')!
  }
  return def.defaultBaseUrl
}

function resolveProviderModel(def: AiProviderDefinition): string {
  const custom = readEnv(def.envModel)
  if (custom) return custom
  if (def.id === 'deepseek' && readEnv('AI_MODEL')) {
    return readEnv('AI_MODEL')!
  }
  return def.defaultModel
}

export function getAllProviders(): AiProviderOption[] {
  return AI_PROVIDER_DEFINITIONS.map((def) => {
    const apiKey = resolveProviderKey(def)
    return {
      id: def.id,
      name: def.name,
      configured: Boolean(apiKey),
      baseUrl: resolveProviderBaseUrl(def),
      defaultModel: resolveProviderModel(def),
      docUrl: def.docUrl,
      models: def.models,
    }
  })
}

export function isAnyAiConfigured(): boolean {
  return getAllProviders().some((p) => p.configured)
}

export function getDefaultProviderId(): AiProviderId {
  const configured = getAllProviders().filter((p) => p.configured)
  if (configured.length === 0) return 'deepseek'
  return configured[0]!.id
}

export function getAiConfig(options?: {
  providerId?: string
  modelOverride?: string
}): AiRuntimeConfig {
  const providers = getAllProviders()
  const requested = options?.providerId as AiProviderId | undefined
  const provider =
    providers.find((p) => p.id === requested && p.configured) ??
    providers.find((p) => p.configured) ??
    providers.find((p) => p.id === (requested ?? 'deepseek'))!

  const def = AI_PROVIDER_DEFINITIONS.find((d) => d.id === provider.id)!
  const apiKey = resolveProviderKey(def)
  const baseUrl = resolveProviderBaseUrl(def)
  const defaultModel = resolveProviderModel(def)
  const model = options?.modelOverride?.trim() || defaultModel

  return {
    providerId: provider.id,
    apiKey,
    baseUrl,
    model,
    configured: Boolean(apiKey),
  }
}

export function resolveGenerationMode(
  mode: string | undefined,
  aiConfigured: boolean,
): GenerationMode {
  if (!aiConfigured) return 'public'
  if (mode === 'ai' || mode === 'hybrid') return mode
  return 'public'
}

/** @deprecated 使用 getAllProviders */
export const SUPPORTED_AI_MODELS = MODELS.deepseek

/** @deprecated 使用 getAiConfig({ providerId }) */
export function getAvailableModels(baseUrl?: string): AiModelOption[] {
  if (baseUrl?.includes('openai.com')) return MODELS.openai
  if (baseUrl?.includes('dashscope')) return MODELS.qwen
  return MODELS.deepseek
}
