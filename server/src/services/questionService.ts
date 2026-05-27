import type { ExamModule, ExamPoint, Question } from '../types/index.js'
import type { WikiSummary, WorldBankPoint, CountryFact } from './publicDataService.js'
import {
  formatArea,
  formatLargeNumber,
  formatPopulation,
  prefetchPublicData,
} from './publicDataService.js'
import { generateParametric, shuffle, pick } from './parametricService.js'
import { generateViaAi, getAiConfig } from './aiService.js'
import type { AiProviderId, GenerationMode } from '../config/aiConfig.js'
import { throwIfAborted } from '../utils/abort.js'

type TemplateItem = Omit<Question, 'id' | 'moduleId' | 'moduleName' | 'topicId' | 'topicName'>
type GenSource = 'public-api' | 'parametric' | 'ai' | 'template'
type GenMode = string

export interface GenerateResult {
  questions: Question[]
  source: GenSource
  mode: GenMode
}

function toQuestion(
  item: TemplateItem,
  module: ExamModule,
  topic: ExamPoint | undefined,
  index: number,
  prefix: string,
): Question {
  return {
    id: `${prefix}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`,
    moduleId: module.id,
    moduleName: module.name,
    topicId: topic?.id,
    topicName: topic?.name,
    ...item,
  }
}

function makeOpts(values: string[], correct: string) {
  const keys = ['A', 'B', 'C', 'D']
  const opts = shuffle(values).slice(0, 4).map((text, i) => ({ key: keys[i], text }))
  const answer = opts.find((o) => o.text === correct)?.key ?? 'A'
  return { options: opts, answer }
}

/** 用世界银行真实数据生成资料分析题 */
function buildZiliaoFromStats(
  points: WorldBankPoint[],
  topic?: ExamPoint,
): TemplateItem | null {
  if (points.length < 2) return null

  const byCountry = new Map<string, WorldBankPoint[]>()
  for (const p of points) {
    const list = byCountry.get(p.country) ?? []
    list.push(p)
    byCountry.set(p.country, list)
  }

  const country = [...byCountry.keys()][Math.floor(Math.random() * byCountry.size)]
  const series = byCountry.get(country)!.sort((a, b) => a.year - b.year)
  if (series.length < 2) return null

  const topicId = topic?.id ?? 'ziliao-zengzhanglv'

  if (topicId.includes('zengzhanglv') || topicId.includes('jiange')) {
    const a = series[series.length - 2]
    const b = series[series.length - 1]
    const rate = Math.round(((b.value - a.value) / a.value) * 1000) / 10
    const wrong = shuffle([
      `${rate}%`,
      `${Math.max(0.1, rate - (2 + Math.random() * 5)).toFixed(1)}%`,
      `${(rate + 2 + Math.random() * 5).toFixed(1)}%`,
      `${(rate + 8 + Math.random() * 5).toFixed(1)}%`,
    ])
    const { options, answer } = makeOpts(wrong, `${rate}%`)
    return {
      type: 'single',
      stem: `根据世界银行数据，${country}${a.year}年${a.indicatorName}为 ${formatLargeNumber(a.value)}，${b.year}年为 ${formatLargeNumber(b.value)}。则 ${b.year} 年同比增长率约为：`,
      options,
      answer,
      analysis: `增长率 = (${formatLargeNumber(b.value)} - ${formatLargeNumber(a.value)}) / ${formatLargeNumber(a.value)} ≈ ${rate}%。数据来源：World Bank Open Data。`,
      difficulty: 'medium',
    }
  }

  if (topicId.includes('bizhong') && byCountry.size >= 2) {
    const countries = [...byCountry.keys()].slice(0, 2)
    const latestYear = Math.max(...series.map((s) => s.year))
    const v1 = byCountry.get(countries[0])!.find((s) => s.year === latestYear) ?? byCountry.get(countries[0])!.at(-1)!
    const v2 = byCountry.get(countries[1])!.find((s) => s.year === latestYear) ?? byCountry.get(countries[1])!.at(-1)!
    const total = v1.value + v2.value
    const pct = Math.round((v1.value / total) * 1000) / 10
    const { options, answer } = makeOpts(
      shuffle([`${pct}%`, `${(100 - pct).toFixed(1)}%`, `${(pct / 2).toFixed(1)}%`, `${(pct * 1.5).toFixed(1)}%`]),
      `${pct}%`,
    )
    return {
      type: 'single',
      stem: `${latestYear}年${countries[0]}与${countries[1]}的${v1.indicatorName}分别为 ${formatLargeNumber(v1.value)} 和 ${formatLargeNumber(v2.value)}。${countries[0]}占两国合计的比重约为：`,
      options,
      answer,
      analysis: `比重 = ${formatLargeNumber(v1.value)} / (${formatLargeNumber(v1.value)}+${formatLargeNumber(v2.value)}) ≈ ${pct}%。`,
      difficulty: 'medium',
    }
  }

  // 默认：两期比较
  const a = series[0]
  const b = series.at(-1)!
  const diff = Math.round(b.value - a.value)
  const { options, answer } = makeOpts(
    shuffle([
      formatLargeNumber(diff),
      formatLargeNumber(diff * 0.6),
      formatLargeNumber(diff * 1.4),
      formatLargeNumber(diff * 2),
    ]),
    formatLargeNumber(diff),
  )
  return {
    type: 'single',
    stem: `根据世界银行数据，${country}${a.year}—${b.year}年${a.indicatorName}变化，${b.year}年较${a.year}年增加约：`,
    options,
    answer,
    analysis: `增量 = ${formatLargeNumber(b.value)} - ${formatLargeNumber(a.value)} ≈ ${formatLargeNumber(diff)}。`,
    difficulty: 'easy',
  }
}

function buildChangshiFromCountries(facts: CountryFact[]): TemplateItem | null {
  if (facts.length < 2) return null
  const [a, b] = pickTwo(facts)
  const variants = [
    () => {
      const ratio = Math.round((a.population / b.population) * 10) / 10
      const correct = `${a.name}人口约为${b.name}的 ${ratio} 倍`
      const { options, answer } = makeOpts(
        shuffle([
          correct,
          `${b.name}人口是${a.name}的 ${ratio} 倍`,
          '两国人口完全相同',
          '无法从公开数据判断',
        ]),
        correct,
      )
      return {
        type: 'single' as const,
        stem: `根据 REST Countries 公开数据，${a.name}人口约 ${formatPopulation(a.population)}，${b.name}约 ${formatPopulation(b.population)}。下列判断正确的是：`,
        options,
        answer,
        analysis: `人口倍数 = ${a.population}/${b.population} ≈ ${ratio}。数据来源：restcountries.com（实时）。`,
        difficulty: 'easy' as const,
      }
    },
    () => {
      const densityA = Math.round(a.population / a.area)
      const densityB = Math.round(b.population / b.area)
      const correct = `${a.name}（约 ${densityA} 人/km²）`
      const { options, answer } = makeOpts(
        shuffle([
          correct,
          `${b.name}（约 ${densityB} 人/km²）`,
          '两国人口密度相同',
          '数据不足以计算',
        ]),
        correct,
      )
      return {
        type: 'single' as const,
        stem: `根据公开数据，${a.name}面积 ${formatArea(a.area)}、人口 ${formatPopulation(a.population)}；${b.name}面积 ${formatArea(b.area)}、人口 ${formatPopulation(b.population)}。人口密度更高的是：`,
        options,
        answer,
        analysis: `${a.name}密度 ≈ ${densityA}，${b.name}密度 ≈ ${densityB}。数据来源：restcountries.com（实时）。`,
        difficulty: 'medium' as const,
      }
    },
  ]
  return pick(variants)()
}

function buildZiliaoFromExchange(rates: Record<string, number>): TemplateItem | null {
  const currencies = ['CNY', 'JPY', 'EUR', 'GBP', 'AUD', 'CAD'].filter((c) => rates[c])
  if (currencies.length < 2) return null

  // 选取交叉汇率在合理区间的币对，避免出现 0.00 的选项
  let c1 = ''
  let c2 = ''
  let ratio = 0
  for (let attempt = 0; attempt < 12; attempt++) {
    ;[c1, c2] = pickTwo(currencies)
    const r1 = rates[c1]!
    const r2 = rates[c2]!
    ratio = Math.round((r2 / r1) * 100) / 100
    if (ratio >= 0.05 && ratio <= 500) break
  }
  if (ratio < 0.05) return null

  const r1 = rates[c1]!
  const r2 = rates[c2]!
  const correct = `1 ${c1} ≈ ${ratio} ${c2}（经 USD 换算）`
  const { options, answer } = makeOpts(
    shuffle([
      correct,
      `1 ${c1} ≈ ${(ratio * 2).toFixed(2)} ${c2}`,
      `1 ${c1} ≈ ${(ratio / 2).toFixed(2)} ${c2}`,
      `两者汇率无关`,
    ]),
    correct,
  )
  return {
    type: 'single',
    stem: `根据 open.er-api.com 最新汇率（以 USD 为基准），${c1} 汇率 ${r1}，${c2} 汇率 ${r2}。下列换算正确的是：`,
    options,
    answer,
    analysis: `经美元交叉换算：1 ${c1} = (1/${r1}) USD = (1/${r1})×${r2} ${c2} ≈ ${ratio} ${c2}。数据来源：open.er-api.com（实时）。`,
    difficulty: 'medium',
  }
}

function pickTwo<T>(arr: T[]): [T, T] {
  const s = shuffle(arr)
  return [s[0], s[1]]
}

/** 用维基百科生成常识题 */
function buildChangshiFromWiki(wiki: WikiSummary): TemplateItem {
  const sentences = wiki.extract.split(/[。！？]/).filter((s) => s.length > 8)
  const fact = sentences[0] ?? wiki.extract.slice(0, 60)
  const wrongFacts = [
    `${wiki.title}最早起源于欧洲`,
    `${wiki.title}与所述内容完全无关`,
    `材料中未提及${wiki.title}的相关信息`,
    `${wiki.title}的核心概念已被完全否定`,
  ]
  const { options, answer } = makeOpts(
    shuffle([fact.slice(0, 50) + '…', ...wrongFacts.slice(0, 3)]),
    fact.slice(0, 50) + '…',
  )
  return {
    type: 'single',
    stem: `根据以下材料，下列说法正确的是：\n【材料】${wiki.extract.slice(0, 120)}…`,
    options,
    answer,
    analysis: `本题基于维基百科「${wiki.title}」词条公开摘要命题，正确选项出自材料原文。`,
    difficulty: 'medium',
  }
}

/** 用维基素材生成申论题 */
function buildShenlunFromWiki(wiki: WikiSummary): TemplateItem {
  return {
    type: 'essay',
    stem: `请根据以下材料，概括「${wiki.title}」的核心要点。（不超过 200 字）\n\n【材料】${wiki.extract}`,
    answer: `应围绕${wiki.title}的定义、背景、主要特征与意义展开概括，提取材料中的关键信息分条表述。`,
    analysis: `归纳概括题：锁定材料主题词「${wiki.title}」，从材料中提取 3—5 个要点，语言简练。`,
    difficulty: 'medium',
  }
}

/** 用真实汇率出数量关系换算题 */
function buildShuliangFromExchange(rates: Record<string, number>, topic?: ExamPoint): TemplateItem | null {
  const currencies = ['CNY', 'JPY', 'EUR', 'GBP', 'KRW', 'AUD'].filter((c) => rates[c])
  if (currencies.length < 2) return null
  const [c1, c2] = pickTwo(currencies)
  const r1 = rates[c1]
  const r2 = rates[c2]
  const amount = pick([100, 200, 500, 1000, 2000])
  const converted = Math.round((amount / r1) * r2 * 100) / 100
  const topicId = topic?.id ?? ''

  if (topicId.includes('lirun')) {
    const cost = amount
    const price = Math.round(converted)
    const margin = Math.round(((price - cost) / cost) * 1000) / 10
    const { options, answer } = makeOpts(
      shuffle([
        `${margin}%`,
        `${Math.max(1, margin - pick([3, 5, 8]))}%`,
        `${margin + pick([3, 5, 8])}%`,
        `${margin + pick([12, 15, 20])}%`,
      ]),
      `${margin}%`,
    )
    return {
      type: 'single',
      stem: `根据 open.er-api.com 实时汇率，${amount} ${c1} 可兑换约 ${price} ${c2}。若以 ${c2} 售出，利润率约为：`,
      options,
      answer,
      analysis: `利润率 = (${price}-${cost})/${cost} ≈ ${margin}%。汇率来源：open.er-api.com（实时）。`,
      difficulty: 'medium',
    }
  }

  const { options, answer } = makeOpts(
    shuffle([
      `${converted} ${c2}`,
      `${Math.round(converted * 1.5)} ${c2}`,
      `${Math.round(converted * 0.6)} ${c2}`,
      `${Math.round(converted * 2)} ${c2}`,
    ]),
    `${converted} ${c2}`,
  )
  return {
    type: 'single',
    stem: `根据 open.er-api.com 实时汇率（USD 基准），${c1}=${r1}，${c2}=${r2}。则 ${amount} ${c1} 约可兑换：`,
    options,
    answer,
    analysis: `${amount} ${c1} → ${amount / r1} USD → ${converted} ${c2}。数据来源：open.er-api.com（实时）。`,
    difficulty: 'medium',
  }
}

/** 用国家公开数据出数量关系题 */
function buildShuliangFromCountries(facts: CountryFact[], topic?: ExamPoint): TemplateItem | null {
  if (facts.length < 2) return null
  const [a, b] = pickTwo(facts)
  const topicId = topic?.id ?? ''

  if (topicId.includes('gailv') || topicId.includes('rongchi')) {
    const total = a.population + b.population
    const pct = Math.round((a.population / total) * 100)
    const { options, answer } = makeOpts(
      shuffle([`${pct}%`, `${100 - pct}%`, `${pct + 15}%`, `${Math.max(5, pct - 20)}%`]),
      `${pct}%`,
    )
    return {
      type: 'single',
      stem: `公开数据显示 ${a.name} 人口 ${formatPopulation(a.population)}，${b.name} 人口 ${formatPopulation(b.population)}。若从两国随机抽取一人，来自 ${a.name} 的概率约为：`,
      options,
      answer,
      analysis: `P = ${a.population}/(${a.population}+${b.population}) ≈ ${pct}%。数据来源：restcountries.com（实时）。`,
      difficulty: 'easy',
    }
  }

  const densityA = Math.round(a.population / a.area)
  const densityB = Math.round(b.population / b.area)
  const mult = Math.round((densityA / densityB) * 10) / 10
  const { options, answer } = makeOpts(
    shuffle([
      `${mult} 倍`,
      `${Math.max(0.5, mult - 1).toFixed(1)} 倍`,
      `${(mult + 1).toFixed(1)} 倍`,
      `${(mult * 2).toFixed(1)} 倍`,
    ]),
    `${mult} 倍`,
  )
  return {
    type: 'single',
    stem: `根据 REST Countries 数据，${a.name} 人口密度约 ${densityA} 人/km²，${b.name} 约 ${densityB} 人/km²。${a.name} 密度约为 ${b.name} 的：`,
    options,
    answer,
    analysis: `倍数 = ${densityA}/${densityB} ≈ ${mult}。数据来源：restcountries.com（实时）。`,
    difficulty: 'medium',
  }
}

/** 用世界银行数据出数量关系题 */
function buildShuliangFromWb(points: WorldBankPoint[], topic?: ExamPoint): TemplateItem | null {
  if (points.length < 2) return null
  const sorted = [...points].sort((a, b) => a.year - b.year)
  const a = sorted[sorted.length - 2] ?? sorted[0]
  const b = sorted[sorted.length - 1]
  if (!a || !b || a.value === b.value) return null

  const topicId = topic?.id ?? ''
  const delta = Math.round(b.value - a.value)

  if (topicId.includes('gongcheng')) {
    const daysA = pick([12, 15, 18, 20, 24])
    const daysB = pick([8, 10, 12, 15])
    const total = daysA * daysB
    const together = pick([3, 4, 5])
    const done = Math.round((total / daysA + total / daysB) * together)
    const remain = total - done
    const soloA = Math.ceil(remain / (total / daysA))
    return {
      type: 'single',
      stem: `世界银行数据显示，${b.country}${a.year}—${b.year}年${a.indicatorName}净增 ${formatLargeNumber(Math.abs(delta))}。类比：甲 ${daysA} 天、乙 ${daysB} 天可各完成总量为 ${total} 的工程，合作 ${together} 天后乙离开，甲再单独做 ${soloA} 天完工。乙工作了：`,
      options: [
        { key: 'A', text: `${together - 1} 天` },
        { key: 'B', text: `${together} 天` },
        { key: 'C', text: `${together + 1} 天` },
        { key: 'D', text: `${together + 2} 天` },
      ],
      answer: 'B',
      analysis: `工程题：合作 ${together} 天期间乙全程参与。背景数据来自 World Bank Open Data（实时）。`,
      difficulty: 'hard',
    }
  }

  const rate = Math.round(((b.value - a.value) / a.value) * 1000) / 10
  const { options, answer } = makeOpts(
    shuffle([
      `${rate}%`,
      `${Math.max(0.1, rate - pick([2, 3, 5])).toFixed(1)}%`,
      `${(rate + pick([2, 3, 5])).toFixed(1)}%`,
      `${(rate + pick([8, 10, 12])).toFixed(1)}%`,
    ]),
    `${rate}%`,
  )
  return {
    type: 'single',
    stem: `世界银行公开数据：${b.country}${a.year}年${a.indicatorName} ${formatLargeNumber(a.value)}，${b.year}年 ${formatLargeNumber(b.value)}。${b.year}年同比增长率约为：`,
    options,
    answer,
    analysis: `增长率 = (${formatLargeNumber(b.value)}-${formatLargeNumber(a.value)})/${formatLargeNumber(a.value)} ≈ ${rate}%。数据来源：World Bank Open Data（实时）。`,
    difficulty: 'medium',
  }
}

/** 维基百科定义判断 */
function buildPanduanFromWiki(wiki: WikiSummary): TemplateItem {
  const def = wiki.description ?? wiki.extract.slice(0, 80)
  const correct = `属于与「${wiki.title}」相关的正确描述`
  const wrong = shuffle([
    `与${wiki.title}完全无关的概念`,
    `与材料定义相矛盾的说法`,
    `材料未提及的内容`,
    `${wiki.title}已被证实不存在`,
  ]).slice(0, 3)
  const { options, answer } = makeOpts(
    shuffle([def.slice(0, 45) + '…', ...wrong]),
    def.slice(0, 45) + '…',
  )
  return {
    type: 'single',
    stem: `定义：${wiki.title} — ${def.slice(0, 100)}…\n\n下列选项符合上述定义的是：`,
    options,
    answer,
    analysis: `定义来自维基百科「${wiki.title}」词条摘要（实时抓取）。`,
    difficulty: 'medium',
  }
}

/** 维基百科类比推理 */
function buildPanduanAnalogyFromWiki(wiki: WikiSummary): TemplateItem | null {
  const words = wiki.title.replace(/[（(].*[)）]/g, '').split(/[、·\s]/).filter((w) => w.length >= 2)
  if (words.length < 1) return null
  const a = words[0]!
  const b = wiki.extract.slice(0, 6).replace(/[^\u4e00-\u9fa5a-zA-Z]/g, '').slice(0, 4) || '概念'
  const c = pick(['实践', '理论', '文化', '技术', '制度', '发展'])
  const d = pick(['应用', '传承', '创新', '规范', '进步', '影响'])
  const { options, answer } = makeOpts(
    shuffle([d, '运动', '时间', '空间', '数量'].filter((w, i, arr) => arr.indexOf(w) === i).slice(0, 4)),
    d,
  )
  return {
    type: 'single',
    stem: `类比推理（素材：维基百科「${wiki.title}」）：${a} : ${b} :: ${c} : ?`,
    options,
    answer,
    analysis: `词项关系需与材料主题「${wiki.title}」逻辑一致。数据来源：zh.wikipedia.org（实时）。`,
    difficulty: 'easy',
  }
}

interface PublicDataPool {
  wbPoints: WorldBankPoint[]
  wbCompare: WorldBankPoint[]
  countries: CountryFact[]
  wikis: WikiSummary[]
  rates: Record<string, number> | null
  wbIdx: number
  countryIdx: number
  wikiIdx: number
}

function takeWbSeries(pool: PublicDataPool): WorldBankPoint[] {
  const byCountry = new Map<string, WorldBankPoint[]>()
  for (const p of pool.wbPoints) {
    const list = byCountry.get(p.country) ?? []
    list.push(p)
    byCountry.set(p.country, list)
  }
  const countries = shuffle([...byCountry.keys()])
  if (countries.length > 0) {
    const c = countries[pool.wbIdx % countries.length]!
    pool.wbIdx++
    return byCountry.get(c) ?? []
  }
  if (pool.wbCompare.length >= 2) {
    pool.wbIdx++
    return pool.wbCompare
  }
  return []
}

function takeCountries(pool: PublicDataPool, n = 2): CountryFact[] {
  if (pool.countries.length < n) return pool.countries
  const start = (pool.countryIdx * n) % pool.countries.length
  pool.countryIdx++
  const slice: CountryFact[] = []
  for (let i = 0; i < n; i++) {
    slice.push(pool.countries[(start + i) % pool.countries.length]!)
  }
  return slice
}

function takeWiki(pool: PublicDataPool): WikiSummary | null {
  if (pool.wikis.length === 0) return null
  const wiki = pool.wikis[pool.wikiIdx % pool.wikis.length]!
  pool.wikiIdx++
  return wiki
}

function generateOneFromPool(
  module: ExamModule,
  topic: ExamPoint | undefined,
  pool: PublicDataPool,
): TemplateItem | null {
  // 资料分析 → 速算考点优先 / World Bank / 汇率
  if (module.id === 'ziliao') {
    if (topic?.id.includes('susuan')) {
      const q = generateParametric(topic)
      if (q) return q
    }
    if (pool.rates && Math.random() > 0.4) {
      const q = buildZiliaoFromExchange(pool.rates)
      if (q) return q
    }
    const compare = pool.wbCompare.length >= 2 ? pool.wbCompare : null
    if (compare && (topic?.id.includes('bizhong') || Math.random() > 0.5)) {
      const [v1, v2] = compare
      const total = v1.value + v2.value
      const pct = Math.round((v1.value / total) * 1000) / 10
      const { options, answer } = makeOpts(
        shuffle([`${pct}%`, `${(100 - pct).toFixed(1)}%`, `${(pct / 2).toFixed(1)}%`, `${(pct * 1.5).toFixed(1)}%`]),
        `${pct}%`,
      )
      return {
        type: 'single',
        stem: `根据世界银行 ${v1.year} 年数据，${v1.country}与${v2.country}的${v1.indicatorName}分别为 ${formatLargeNumber(v1.value)} 和 ${formatLargeNumber(v2.value)}。${v1.country}占两国合计比重约为：`,
        options,
        answer,
        analysis: `比重 ≈ ${pct}%。数据来源：World Bank Open Data（实时）。`,
        difficulty: 'medium',
      }
    }
    const series = takeWbSeries(pool)
    const q = buildZiliaoFromStats(series.length >= 2 ? series : pool.wbPoints, topic)
    if (q) return q
  }

  // 数量关系 → 优先公共数据（汇率/国家/世行）
  if (module.id === 'shuliang') {
    const builders = shuffle([
      () => pool.rates ? buildShuliangFromExchange(pool.rates, topic) : null,
      () => buildShuliangFromCountries(takeCountries(pool, 2), topic),
      () => buildShuliangFromWb(takeWbSeries(pool), topic),
    ])
    for (const build of builders) {
      const q = build()
      if (q) return q
    }
  }

  // 常识 → REST Countries / 维基
  if (module.id === 'changshi') {
    const countries = takeCountries(pool, 2)
    if (countries.length >= 2) {
      const q = buildChangshiFromCountries(countries)
      if (q) return q
    }
    const wiki = takeWiki(pool)
    if (wiki) return buildChangshiFromWiki(wiki)
  }

  // 言语 → 维基
  if (module.id === 'yanyu') {
    const wiki = takeWiki(pool)
    if (wiki) {
      const topicId = topic?.id ?? ''
      if (topicId.includes('luoji') || topicId.includes('tiankong')) {
        const word = wiki.title.slice(0, 4)
        return {
          type: 'single',
          stem: `依次填入画横线部分最恰当的一项是：${wiki.extract.slice(0, 40)}…，这体现了______的精神内涵。`,
          options: [
            { key: 'A', text: `${word}  传承` },
            { key: 'B', text: '创新  发展' },
            { key: 'C', text: '开放  包容' },
            { key: 'D', text: '坚守  突破' },
          ],
          answer: 'A',
          analysis: `材料来自维基百科「${wiki.title}」（实时）。`,
          difficulty: 'medium',
        }
      }
      const correct = `${wiki.title}的相关内容`
      const opts = shuffle([correct, '完全无关的历史事件', '与材料矛盾的观点', '材料未涉及的话题'])
      const options = opts.map((text, i) => ({ key: 'ABCD'[i], text }))
      return {
        type: 'single',
        stem: `阅读材料：${wiki.extract.slice(0, 150)}…\n\n这段材料主要说明的是：`,
        options,
        answer: options.find((o) => o.text === correct)!.key,
        analysis: `材料来自维基百科「${wiki.title}」（实时抓取）。`,
        difficulty: 'medium',
      }
    }
  }

  // 申论 → 维基
  if (module.id === 'shenlun') {
    const wiki = takeWiki(pool)
    if (wiki) return buildShenlunFromWiki(wiki)
  }

  // 判断推理 → 维基定义/类比
  if (module.id === 'panduan') {
    const wiki = takeWiki(pool)
    if (wiki) {
      if (!topic || topic.id.includes('dingyi')) return buildPanduanFromWiki(wiki)
      if (topic.id.includes('leibi')) {
        const q = buildPanduanAnalogyFromWiki(wiki)
        if (q) return q
      }
      return Math.random() > 0.5 ? buildPanduanFromWiki(wiki) : buildPanduanAnalogyFromWiki(wiki)
    }
    const countries = takeCountries(pool, 2)
    if (countries.length >= 2) {
      return buildChangshiFromCountries(countries)
    }
  }

  return null
}

async function generateViaPublicAndParametric(
  module: ExamModule,
  count: number,
  difficulty: string | undefined,
  topic: ExamPoint | undefined,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const questions: Question[] = []
  let publicCount = 0
  let parametricCount = 0

  // 每轮生成前并行拉取公共数据（World Bank / 国家 / 维基 / 汇率）
  let pool: PublicDataPool = {
    wbPoints: [],
    wbCompare: [],
    countries: [],
    wikis: [],
    rates: null,
    wbIdx: 0,
    countryIdx: 0,
    wikiIdx: 0,
  }

  try {
    throwIfAborted(signal)
    const prefetched = await prefetchPublicData(module.id, count)
    pool = { ...prefetched, wbIdx: 0, countryIdx: 0, wikiIdx: 0 }
    console.log(
      `[public-api] 预取完成 module=${module.id} wb=${pool.wbPoints.length} countries=${pool.countries.length} wiki=${pool.wikis.length} rates=${pool.rates ? 'ok' : 'fail'}`,
    )
  } catch (e) {
    console.warn('[public-api] 批量预取失败，将逐题补拉:', e)
  }

  for (let i = 0; i < count; i++) {
    throwIfAborted(signal)
    let item: TemplateItem | null = null
    let prefix = 'dyn'

    // 速算考点：直接参数化（不依赖公共 API）
    if (topic?.id.includes('susuan')) {
      item = generateParametric(topic)
      if (item) {
        parametricCount++
        prefix = 'param'
      }
    }

    // 1. 优先公共数据 API（每题从池中取不同切片）
    if (!item) {
      item = generateOneFromPool(module, topic, pool)
      if (item) {
        publicCount++
        prefix = 'api'
      }
    }

    // 池数据不足时，单题补拉
    if (!item) {
      throwIfAborted(signal)
      try {
        const extra = await prefetchPublicData(module.id, 1)
        pool.wbPoints.push(...extra.wbPoints)
        pool.wbCompare.push(...extra.wbCompare)
        pool.countries.push(...extra.countries)
        pool.wikis.push(...extra.wikis)
        if (!pool.rates && extra.rates) pool.rates = extra.rates
        item = generateOneFromPool(module, topic, pool)
        if (item) {
          publicCount++
          prefix = 'api'
        }
      } catch (e) {
        console.warn(`[public-api] 第 ${i + 1} 题补拉失败:`, e)
      }
    }

    // 2. 网络失败时才用参数化随机（数字会变，但非公共数据）
    if (!item && topic) {
      item = generateParametric(topic)
      if (item) {
        parametricCount++
        prefix = 'param'
      }
    }

    if (!item && module.id === 'ziliao') {
      item = generateParametric(
        topic ?? ({ id: 'ziliao-zengzhanglv', moduleId: 'ziliao', name: '增长率', description: '' } as ExamPoint),
      )
      if (item) {
        parametricCount++
        prefix = 'param'
      }
    }

    if (!item) {
      const genericTopic =
        topic ??
        ({
          id: `${module.id}-fallback`,
          moduleId: module.id,
          name: module.name,
          description: '',
        } as ExamPoint)
      item = generateParametric(genericTopic)
      if (item) {
        parametricCount++
        prefix = 'param'
      }
    }

    if (!item) {
      throw new Error(`${module.name}题目生成失败，请检查网络后重试`)
    }

    questions.push(toQuestion(item, module, topic, i, prefix))
  }

  const mode =
    publicCount === count
      ? 'public-api'
      : publicCount > 0
        ? 'public-api-mixed'
        : parametricCount === count
          ? 'parametric'
          : 'mixed'

  const source: GenSource = publicCount > 0 ? 'public-api' : parametricCount > 0 ? 'parametric' : 'template'

  return { questions, source, mode }
}

/** 统一出题入口：公共 API + 参数化，可选 AI 增强 */
export async function generateQuestions(
  module: ExamModule,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
  topic?: ExamPoint,
  options?: {
    /** @deprecated 请用 generationMode: 'ai' */
    preferAi?: boolean
    generationMode?: GenerationMode
    aiProvider?: AiProviderId | string
    aiModel?: string
    signal?: AbortSignal
  },
): Promise<GenerateResult & { aiModel?: string; aiProvider?: string }> {
  const aiConfig = getAiConfig({
    providerId: options?.aiProvider,
    modelOverride: options?.aiModel,
  })
  const generationMode: GenerationMode =
    options?.generationMode ??
    (options?.preferAi && aiConfig.configured ? 'ai' : 'public')
  const signal = options?.signal

  throwIfAborted(signal)

  // 纯 AI 模式
  if (generationMode === 'ai' && aiConfig.configured) {
    try {
      const { questions, model, providerId } = await generateViaAi(
        module, count, difficulty, topic,
        { providerId: options?.aiProvider, modelOverride: options?.aiModel, signal },
      )
      return { questions, source: 'ai', mode: 'ai', aiModel: model, aiProvider: providerId }
    } catch (e) {
      if (e instanceof Error && e.name === 'AbortError') throw e
      console.warn('[AI] 失败，回退公共数据:', e)
    }
  }

  // 默认 / 混合：公共数据 + 参数化
  const result = await generateViaPublicAndParametric(module, count, difficulty, topic, signal)

  // 混合模式：公共数据未全覆盖时，用 AI 补全剩余题
  if (
    generationMode === 'hybrid' &&
    aiConfig.configured &&
    result.mode !== 'public-api'
  ) {
    const publicOnly = result.questions.filter((q) => q.id.startsWith('api-'))
    const needAi = count - publicOnly.length
    if (needAi > 0) {
      try {
        throwIfAborted(signal)
        const { questions: aiQuestions, model, providerId } = await generateViaAi(
          module, needAi, difficulty, topic,
          { providerId: options?.aiProvider, modelOverride: options?.aiModel, signal },
        )
        const merged = [...publicOnly, ...aiQuestions].slice(0, count)
        return {
          questions: merged,
          source: publicOnly.length > 0 ? 'public-api' : 'ai',
          mode: publicOnly.length > 0 ? 'public-api-ai-hybrid' : 'ai',
          aiModel: model,
          aiProvider: providerId,
        }
      } catch (e) {
        if (e instanceof Error && e.name === 'AbortError') throw e
        console.warn('[AI] 混合补全失败，保留公共数据结果:', e)
      }
    }
  }

  return result
}
