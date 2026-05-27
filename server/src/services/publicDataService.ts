/**
 * 公共开放数据接口（无需 API Key）
 * - World Bank Open Data：GDP、人口、失业率
 * - REST Countries：各国人口、面积
 * - 中文维基百科：随机词条（常识/言语/申论素材）
 * - Exchange Rate API：汇率数据（资料分析）
 */

export interface WorldBankPoint {
  country: string
  countryCode: string
  year: number
  value: number
  indicator: string
  indicatorName: string
}

export interface WikiSummary {
  title: string
  extract: string
  description?: string
}

export interface CountryFact {
  name: string
  population: number
  area: number
}

const WB_BASE = 'https://api.worldbank.org/v2'
const FETCH_TIMEOUT = 15000

const COUNTRY_POOL = [
  { code: 'CHN', name: '中国' },
  { code: 'USA', name: '美国' },
  { code: 'JPN', name: '日本' },
  { code: 'DEU', name: '德国' },
  { code: 'IND', name: '印度' },
  { code: 'BRA', name: '巴西' },
  { code: 'KOR', name: '韩国' },
  { code: 'FRA', name: '法国' },
]

const INDICATORS = [
  { id: 'NY.GDP.MKTP.CD', name: 'GDP（现价美元）' },
  { id: 'NY.GDP.MKTP.KD.ZG', name: 'GDP 增长率' },
  { id: 'SP.POP.TOTL', name: '总人口' },
  { id: 'NY.GDP.PCAP.CD', name: '人均 GDP' },
]

async function fetchJson<T>(url: string, timeout = FETCH_TIMEOUT): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'kaogong-tool/1.0' },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return (await res.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

function pickRandom<T>(arr: T[], n = 1): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n)
}

type WbRow = {
  country: { value: string }
  countryiso3code: string
  date: string
  value: number | null
}

/** 世界银行：单国单指标 */
export async function fetchWorldBankData(
  countryCode?: string,
  indicatorId?: string,
): Promise<WorldBankPoint[]> {
  const indicator = indicatorId
    ? INDICATORS.find((i) => i.id === indicatorId) ?? pickRandom(INDICATORS)[0]
    : pickRandom(INDICATORS)[0]

  const country = countryCode
    ? COUNTRY_POOL.find((c) => c.code === countryCode) ?? pickRandom(COUNTRY_POOL)[0]
    : pickRandom(COUNTRY_POOL)[0]

  const startYear = 2015 + Math.floor(Math.random() * 4)
  const endYear = startYear + 3 + Math.floor(Math.random() * 3)

  const url = `${WB_BASE}/country/${country.code}/indicator/${indicator.id}?format=json&per_page=30&date=${startYear}:${endYear}`

  const data = await fetchJson<[unknown, WbRow[]]>(url)
  const rows = (data[1] ?? []).filter((r) => r.value != null)

  return rows.map((r) => ({
    country: country.name,
    countryCode: country.code,
    year: Number(r.date),
    value: r.value as number,
    indicator: indicator.id,
    indicatorName: indicator.name,
  }))
}

/** 并行拉取多国多指标，保证每次批次数据不同 */
export async function fetchWorldBankBatch(batchSize = 3): Promise<WorldBankPoint[]> {
  const tasks = Array.from({ length: batchSize }, () =>
    fetchWorldBankData().catch(() => [] as WorldBankPoint[]),
  )
  const chunks = await Promise.all(tasks)
  return chunks.flat()
}

/** 两国同一指标对比（比重/倍数题） */
export async function fetchWorldBankCompare(): Promise<WorldBankPoint[]> {
  const indicator = pickRandom(INDICATORS)[0]
  const countries = pickRandom(COUNTRY_POOL, 2)
  const year = 2018 + Math.floor(Math.random() * 5)

  const tasks = countries.map(async (country) => {
    const url = `${WB_BASE}/country/${country.code}/indicator/${indicator.id}?format=json&per_page=5&date=${year}:${year}`
    const data = await fetchJson<[unknown, WbRow[]]>(url)
    const row = (data[1] ?? []).find((r) => r.value != null)
    if (!row) return null
    return {
      country: country.name,
      countryCode: country.code,
      year: Number(row.date),
      value: row.value as number,
      indicator: indicator.id,
      indicatorName: indicator.name,
    } satisfies WorldBankPoint
  })

  const results = await Promise.all(tasks)
  return results.filter((r): r is WorldBankPoint => r != null)
}

/** REST Countries：各国人口面积 */
export async function fetchCountryFacts(count = 5): Promise<CountryFact[]> {
  const data = await fetchJson<Array<{ name: { common: string }; population: number; area: number }>>(
    'https://restcountries.com/v3.1/all?fields=name,population,area',
    12000,
  )
  return pickRandom(data, count).map((c) => ({
    name: c.name.common,
    population: c.population,
    area: c.area,
  }))
}

/** 汇率数据 */
export async function fetchExchangeRates(): Promise<Record<string, number>> {
  const data = await fetchJson<{ rates: Record<string, number> }>(
    'https://open.er-api.com/v6/latest/USD',
    8000,
  )
  return data.rates
}

/** 中文维基随机词条 */
export async function fetchWikiSummary(): Promise<WikiSummary> {
  const data = await fetchJson<{ title: string; extract: string; description?: string }>(
    'https://zh.wikipedia.org/api/rest_v1/page/random/summary',
    10000,
  )
  return {
    title: data.title,
    extract: data.extract?.replace(/\n/g, ' ').slice(0, 400) ?? '',
    description: data.description,
  }
}

export async function fetchWikiBatch(count: number): Promise<WikiSummary[]> {
  const tasks = Array.from({ length: count }, () =>
    fetchWikiSummary().catch(() => null),
  )
  const results = await Promise.all(tasks)
  const seen = new Set<string>()
  return results.filter((item): item is WikiSummary => {
    if (!item || item.extract.length < 20 || seen.has(item.title)) return false
    seen.add(item.title)
    return true
  })
}

export function formatLargeNumber(n: number): string {
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(2)} 万亿美元`
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)} 亿`
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(2)} 万`
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export function formatPopulation(n: number): string {
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)} 亿人`
  if (n >= 1e4) return `${(n / 1e4).toFixed(0)} 万人`
  return `${n} 人`
}

export function formatArea(n: number): string {
  if (n >= 1e6) return `${(n / 1e4).toFixed(0)} 万 km²`
  if (n >= 1e4) return `${(n / 1e4).toFixed(2)} 万 km²`
  return `${Math.round(n).toLocaleString()} km²`
}

/** 按模块批量预取公共数据（并行请求，每题用不同切片） */
export async function prefetchPublicData(
  moduleId: string,
  questionCount: number,
): Promise<{
  wbPoints: WorldBankPoint[]
  wbCompare: WorldBankPoint[]
  countries: CountryFact[]
  wikis: WikiSummary[]
  rates: Record<string, number> | null
}> {
  const n = Math.max(questionCount + 1, 3)
  const needsWb = ['ziliao', 'shuliang', 'changshi'].includes(moduleId)
  const needsCountries = ['changshi', 'shuliang', 'panduan', 'ziliao'].includes(moduleId)
  const needsWiki = ['changshi', 'yanyu', 'shenlun', 'panduan'].includes(moduleId)
  const needsRates = ['ziliao', 'shuliang'].includes(moduleId)

  const [wbPoints, wbCompare, countries, wikis, rates] = await Promise.all([
    needsWb ? fetchWorldBankBatch(n).catch(() => [] as WorldBankPoint[]) : Promise.resolve([]),
    needsWb || moduleId === 'ziliao'
      ? fetchWorldBankCompare().catch(() => [] as WorldBankPoint[])
      : Promise.resolve([]),
    needsCountries
      ? fetchCountryFacts(n * 2).catch(() => [] as CountryFact[])
      : Promise.resolve([]),
    needsWiki ? fetchWikiBatch(n + 1).catch(() => [] as WikiSummary[]) : Promise.resolve([]),
    needsRates ? fetchExchangeRates().catch(() => null) : Promise.resolve(null),
  ])

  return { wbPoints, wbCompare, countries, wikis, rates }
}
