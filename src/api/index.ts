const API_BASE = import.meta.env.VITE_API_BASE ?? '/api'
const DEV = import.meta.env.DEV

function devApiLog(label: string, payload: { request?: unknown; response?: unknown; ms?: number }) {
  if (!DEV) return
  console.groupCollapsed(`%c[API] ${label}${payload.ms != null ? ` · ${payload.ms}ms` : ''}`, 'color:#6366f1;font-weight:bold')
  if (payload.request !== undefined) console.log('📤 请求', payload.request)
  if (payload.response !== undefined) console.log('📥 响应', payload.response)
  console.groupEnd()
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const started = performance.now()
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw err
  }
  const data = await res.json()
  const ms = Math.round(performance.now() - started)

  if (DEV && (path.includes('/generate') || path.includes('/prepare'))) {
    let body: unknown
    try {
      body = options?.body ? JSON.parse(options.body as string) : undefined
    } catch {
      body = options?.body
    }
    devApiLog(path, {
      request: body,
      response: data,
      ms,
    })
  }

  if (!res.ok) {
    throw new Error(data.error ?? '请求失败')
  }
  return data as T
}

export const api = {
  getModules: () =>
    request<{ modules: import('@/types').ExamModule[] }>('/questions/modules'),

  getTopics: (moduleId: string) =>
    request<{ topics: import('@/types').ExamPoint[] }>(`/questions/topics/${moduleId}`),

  getExperts: (moduleId: string) =>
    request<{ experts: import('@/types').ExamExpert[] }>(`/questions/experts/${moduleId}`),

  generateQuestions: (
    body: import('@/types').GenerateRequest,
    opts?: { signal?: AbortSignal },
  ) =>
    request<{
      module: import('@/types').ExamModule
      topic?: import('@/types').ExamPoint
      questions: import('@/types').Question[]
      source: 'ai'
      mode?: string
      aiProvider?: import('@/types').AiProviderId
      aiModel?: string
      expertTag?: string
      _meta?: {
        durationMs: number
        source: string
        mode?: string
        aiModel?: string
        previews: Array<{ index: number; stem: string; answer: string; fromAi: boolean }>
      }
    }>('/questions/generate', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: opts?.signal,
    }),

  getAiConfig: () =>
    request<{
      anyConfigured: boolean
      configured: boolean
      defaultProviderId: import('@/types').AiProviderId
      defaultModel: string
      baseUrl: string
      providers: import('@/types').AiProviderOption[]
    }>('/questions/ai-config'),

  getVocabStats: () =>
    request<{ total: number; categories: import('@/types').VocabCategory[] }>('/vocab/stats'),

  getVocabCategories: () =>
    request<{ categories: import('@/types').VocabCategory[] }>('/vocab/categories'),

  listVocab: (params: {
    categoryId?: string
    keyword?: string
    page?: number
    pageSize?: number
  }) => {
    const qs = new URLSearchParams()
    if (params.categoryId) qs.set('categoryId', params.categoryId)
    if (params.keyword?.trim()) qs.set('keyword', params.keyword.trim())
    if (params.page) qs.set('page', String(params.page))
    if (params.pageSize) qs.set('pageSize', String(params.pageSize))
    return request<{
      items: import('@/types').VocabItem[]
      total: number
      page: number
      pageSize: number
    }>(`/vocab/list?${qs}`)
  },

  webLookupVocab: (keyword: string) =>
    request<import('@/types').VocabWebLookupResult>(
      `/vocab/web-lookup?keyword=${encodeURIComponent(keyword)}`,
    ),

  generateVocab: (body: { count?: number; categoryId?: string; mode?: 'quiz' | 'cards' }) =>
    request<{
      mode: 'quiz' | 'cards'
      questions?: import('@/types').Question[]
      cards?: import('@/types').VocabItem[]
      count: number
    }>('/vocab/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  prepareXhs: (questions: import('@/types').Question[], opts?: { signal?: AbortSignal }) =>
    request<{
      post: import('@/types').XhsPostContent
      copyText: string
      creatorUrl: string
      douyinPost: import('@/types').XhsPostContent
      douyinCopyText: string
      douyinCreatorUrl: string
      imageCount: number
      _meta?: {
        durationMs: number
        xhsTitle: string
        xhsTags: string[]
        imageCount: number
      }
    }>('/xhs/prepare', {
      method: 'POST',
      body: JSON.stringify({ questions }),
      signal: opts?.signal,
    }),

  health: () =>
    request<{
      ok: boolean
      aiConfigured: boolean
      anyConfigured?: boolean
      defaultProviderId?: import('@/types').AiProviderId
      aiModel?: string
      aiBaseUrl?: string
      providers?: import('@/types').AiProviderOption[]
    }>('/health'),
}
