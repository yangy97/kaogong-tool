import type { ExamPoint, Question } from '../types/index.js'

type TemplateItem = Omit<Question, 'id' | 'moduleId' | 'moduleName' | 'topicId' | 'topicName'>

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)]
const shuffle = <T>(arr: T[]): T[] => {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rand(0, i)
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function makeSingle(
  stem: string,
  options: Array<{ key: string; text: string }>,
  answer: string,
  analysis: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium',
): TemplateItem {
  return { type: 'single', stem, options, answer, analysis, difficulty }
}

/** 按考点动态生成（每次数字/情境不同） */
export function generateParametric(topic: ExamPoint): TemplateItem | null {
  switch (topic.id) {
    case 'ziliao-zengzhanglv': {
      const base = rand(20, 90) * 100
      const rate = rand(5, 18)
      const current = Math.round(base * (1 + rate / 100))
      const wrong1 = rate - rand(2, 4)
      const wrong2 = rate + rand(2, 4)
      const wrong3 = rate + rand(5, 8)
      const opts = shuffle([
        { text: `${wrong1}%`, ok: false },
        { text: `${rate}%`, ok: true },
        { text: `${wrong2}%`, ok: false },
        { text: `${wrong3}%`, ok: false },
      ])
      const keys = ['A', 'B', 'C', 'D']
      const options = opts.map((o, i) => ({ key: keys[i], text: o.text }))
      const answer = options[opts.findIndex((o) => o.ok)]!.key
      return makeSingle(
        `2023 年某市 GDP 为 ${base} 亿元，2024 年 GDP 为 ${current} 亿元。则 2024 年同比增长率约为：`,
        options,
        answer,
        `增长率 = (${current}-${base})/${base} = ${rate}%。`,
        rate <= 10 ? 'easy' : 'medium',
      )
    }
    case 'ziliao-bizhong': {
      const total = rand(30, 80) * 100
      const pct = rand(12, 35)
      const part = Math.round(total * pct / 100)
      const correct = `${pct}%`
      const options = shuffle([
        `${pct - rand(2, 4)}%`,
        correct,
        `${pct + rand(2, 4)}%`,
        `${pct + rand(6, 10)}%`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `2024 年某行业总产值 ${total} 亿元，其中 A 企业产值 ${part} 亿元。A 企业产值占比约为：`,
        options,
        options.find((o) => o.text === correct)!.key,
        `比重 = ${part}/${total} ≈ ${pct}%。`,
        'easy',
      )
    }
    case 'ziliao-zengzhangliang': {
      const base = rand(40, 120) * 10
      const rate = rand(8, 25)
      const delta = Math.round(base * rate / 100)
      const options = shuffle([
        `${delta - rand(5, 15)}`,
        `${delta}`,
        `${delta + rand(5, 15)}`,
        `${delta + rand(20, 40)}`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text: `${text} 亿元` }))
      return makeSingle(
        `2023 年某产品销售额 ${base} 亿元，同比增长 ${rate}%。则增长量约为：`,
        options,
        options.find((o) => o.text === `${delta} 亿元`)!.key,
        `增长量 = 基期 × 增长率 = ${base} × ${rate}% ≈ ${delta} 亿元。`,
        'medium',
      )
    }
    case 'ziliao-pingjun': {
      const n = rand(20, 80)
      const total = n * rand(50, 200)
      const avg = Math.round(total / n)
      const options = shuffle([
        `${avg - rand(3, 8)}`,
        `${avg}`,
        `${avg + rand(3, 8)}`,
        `${avg + rand(10, 15)}`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text: `${text} 万元` }))
      return makeSingle(
        `某单位 ${n} 人，全年产值 ${total} 万元。则人均产值约为：`,
        options,
        options.find((o) => o.text === `${avg} 万元`)!.key,
        `平均数 = ${total}/${n} ≈ ${avg} 万元。`,
        'easy',
      )
    }
    case 'ziliao-beishu': {
      const a = rand(15, 45)
      const mult = rand(2, 5)
      const b = a * mult
      const options = shuffle([
        `${mult - 1} 倍`,
        `${mult} 倍`,
        `${mult + 1} 倍`,
        `${mult + 2} 倍`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `A 企业产值 ${a} 亿元，B 企业产值 ${b} 亿元。B 是 A 的：`,
        options,
        options.find((o) => o.text === `${mult} 倍`)!.key,
        `${b}/${a} = ${mult} 倍。`,
        'easy',
      )
    }
    case 'ziliao-jiange': {
      const r1 = rand(5, 12)
      const r2 = rand(8, 20)
      const interval = Math.round((r1 + r2 + (r1 * r2) / 100) * 10) / 10
      const options = shuffle([
        `${Math.round(r1 + r2)}%`,
        `${interval}%`,
        `${Math.round(r1 + r2 + 5)}%`,
        `${Math.round(r1 * r2 / 10)}%`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `某指标 2022 年增长 ${r1}%，2023 年增长 ${r2}%。则 2023 年相对 2021 年的间隔增长率约为：`,
        options,
        options.find((o) => o.text === `${interval}%`)!.key,
        `间隔增长率 ≈ ${r1}%+${r2}%+${r1}%×${r2}% ≈ ${interval}%。`,
        'medium',
      )
    }
    case 'ziliao-susuan-baifen': {
      const pairs: Array<[string, string, number]> = [
        ['1/2', '50%', 50],
        ['1/3', '33.3%', 33.3],
        ['1/4', '25%', 25],
        ['1/5', '20%', 20],
        ['1/6', '16.7%', 16.7],
        ['1/7', '14.3%', 14.3],
        ['1/8', '12.5%', 12.5],
        ['1/9', '11.1%', 11.1],
      ]
      const [frac, pct, val] = pick(pairs)
      const wrongFracs = shuffle(pairs.filter((p) => p[0] !== frac).map((p) => p[0])).slice(0, 3)
      const options = shuffle([frac, ...wrongFracs]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `资料分析速算：${pct} 约等于下列哪个分数？`,
        options,
        options.find((o) => o.text === frac)!.key,
        `常见转化：${pct} ≈ ${frac}（${val}%）。速算时可记「八分之一=12.5%」等口诀。`,
        'easy',
      )
    }
    case 'ziliao-susuan-shouwei': {
      const a = rand(1200, 4800)
      const b = rand(1300, 5200)
      const sum = a + b
      const lead = Math.floor(sum / 1000)
      const correct = `约 ${lead * 1000}`
      const options = shuffle([
        correct,
        `约 ${(lead - 1) * 1000}`,
        `约 ${(lead + 1) * 1000}`,
        `约 ${(lead + 2) * 1000}`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `速算（首数法）：${a} + ${b} = ?`,
        options,
        options.find((o) => o.text === correct)!.key,
        `精确值 ${sum}，首位相加得 ${lead}xxx，首数法选约 ${lead * 1000}。`,
        'easy',
      )
    }
    case 'ziliao-susuan-fangsu': {
      const a = rand(48, 52) * 10 + rand(0, 9)
      const b = rand(18, 22)
      const exact = a * b
      const approx = Math.round(a / 10) * 10 * (b + 1)
      const correct = `约 ${approx}`
      const options = shuffle([
        correct,
        `约 ${approx - rand(800, 1200)}`,
        `约 ${approx + rand(800, 1200)}`,
        `约 ${approx * 2}`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `速算（放缩法）：${a} × ${b} ≈ ?（将 ${a} 看作 ${Math.round(a / 10) * 10}，${b} 看作 ${b + 1}）`,
        options,
        options.find((o) => o.text === correct)!.key,
        `放缩：${Math.round(a / 10) * 10}×${b + 1}=${approx}，精确值 ${exact}，误差可控。`,
        'medium',
      )
    }
    case 'ziliao-susuan-bijiao': {
      const a = rand(35, 48) * 10
      const b = rand(72, 95) * 10
      const c = rand(38, 52) * 10
      const d = rand(88, 98) * 10
      const left = a / b
      const right = c / d
      const correct = left > right ? `${a}/${b} 更大` : `${c}/${d} 更大`
      const options = shuffle([
        correct,
        left > right ? `${c}/${d} 更大` : `${a}/${b} 更大`,
        '两者相等',
        '无法判断',
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `速算比大小：不精算，判断 ${a}/${b} 与 ${c}/${d} 的大小关系。`,
        options,
        options.find((o) => o.text === correct)!.key,
        `直除或交叉相乘：${a}×${d}=${a * d}，${c}×${b}=${c * b}，比较积的大小即可。`,
        'medium',
      )
    }
    case 'shuliang-gongcheng': {
      const a = pick([6, 8, 10, 12, 15, 18, 20])
      const b = pick([9, 12, 15, 18, 24, 30])
      const together = rand(2, 5)
      const lcm = (a * b) / gcd(a, b)
      const effA = lcm / a
      const effB = lcm / b
      const done = (effA + effB) * together
      const remain = lcm - done
      const soloA = Math.ceil(remain / effA)
      return makeSingle(
        `一项工程，甲单独做 ${a} 天，乙单独做 ${b} 天。两人合作 ${together} 天后乙离开，甲又单独做了 ${soloA} 天完成。问乙工作了几天？`,
        [
          { key: 'A', text: `${together - 1} 天` },
          { key: 'B', text: `${together} 天` },
          { key: 'C', text: `${together + 1} 天` },
          { key: 'D', text: `${together + 2} 天` },
        ],
        'B',
        `设总量 ${lcm}，甲效率 ${effA}，乙效率 ${effB}，合作 ${together} 天后乙离开，乙工作 ${together} 天。`,
        'hard',
      )
    }
    case 'shuliang-xingcheng': {
      const dist = pick([100, 120, 150, 180, 240])
      const va = pick([30, 40, 50, 60])
      const vb = pick([20, 25, 30, 35])
      const t = dist / (va + vb)
      const meet = Math.round(va * t)
      const options = shuffle([
        meet - rand(5, 15),
        meet,
        meet + rand(5, 15),
        meet + rand(20, 30),
      ]).map((v, i) => ({ key: 'ABCD'[i], text: `${v} 千米` }))
      return makeSingle(
        `甲、乙相距 ${dist} 千米同时相向而行，甲速 ${va}km/h，乙速 ${vb}km/h。相遇时甲走了：`,
        options,
        options.find((o) => o.text === `${meet} 千米`)!.key,
        `相遇时间 = ${dist}/(${va}+${vb}) = ${t.toFixed(1)}h，甲路程 = ${va}×${t.toFixed(1)} ≈ ${meet}km。`,
        'medium',
      )
    }
    case 'shuliang-lirun': {
      const cost = rand(50, 200) * 10
      const margin = rand(15, 40)
      const price = Math.round(cost * (1 + margin / 100))
      const options = shuffle([
        `${margin - rand(3, 6)}%`,
        `${margin}%`,
        `${margin + rand(3, 6)}%`,
        `${margin + rand(10, 15)}%`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `某商品成本 ${cost} 元，按 ${price} 元售出。则利润率约为：`,
        options,
        options.find((o) => o.text === `${margin}%`)!.key,
        `利润率 = (${price}-${cost})/${cost} = ${margin}%。`,
        'medium',
      )
    }
    case 'shuliang-pailie': {
      const n = rand(5, 8)
      const r = rand(2, 3)
      const fact = (x: number) => (x <= 1 ? 1 : x * fact(x - 1))
      const ans = fact(n) / fact(n - r)
      const options = shuffle([
        ans - rand(10, 30),
        ans,
        ans + rand(10, 30),
        ans * 2,
      ]).map((v, i) => ({ key: 'ABCD'[i], text: `${Math.max(v, 2)} 种` }))
      return makeSingle(
        `从 ${n} 个不同元素中取 ${r} 个排列，共有多少种排法？`,
        options,
        options.find((o) => o.text === `${ans} 种`)!.key,
        `排列数 A(${n},${r}) = ${n}!/(${n}-${r})! = ${ans}。`,
        'medium',
      )
    }
    case 'shuliang-gailv': {
      const red = rand(3, 6)
      const blue = rand(2, 5)
      const total = red + blue
      const p = Math.round((red / total) * 100)
      const options = shuffle([
        `${p - rand(5, 10)}%`,
        `${p}%`,
        `${p + rand(5, 10)}%`,
        `${100 - p}%`,
      ]).map((text, i) => ({ key: 'ABCD'[i], text }))
      return makeSingle(
        `袋中有红球 ${red} 个、蓝球 ${blue} 个，随机取一球，取到红球的概率约为：`,
        options,
        options.find((o) => o.text === `${p}%`)!.key,
        `P(红) = ${red}/${total} ≈ ${p}%。`,
        'easy',
      )
    }
    case 'shuliang-rongchi': {
      const onlyA = rand(40, 60)
      const onlyB = rand(35, 55)
      const both = rand(15, 25)
      const total = onlyA + onlyB - both
      const options = shuffle([
        `${total - rand(5, 10)}`,
        `${total}`,
        `${total + rand(5, 10)}`,
        `${onlyA + onlyB}`,
      ]).map((v, i) => ({ key: 'ABCD'[i], text: `${v} 人` }))
      return makeSingle(
        `50 人调查：喜欢 A 的有 ${onlyA} 人，喜欢 B 的有 ${onlyB} 人，两者都喜欢的 ${both} 人。至少喜欢一种的有：`,
        options,
        options.find((o) => o.text === `${total} 人`)!.key,
        `容斥：${onlyA}+${onlyB}-${both} = ${total} 人。`,
        'medium',
      )
    }
    default:
      return null
  }
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b)
}

export { shuffle, rand, pick }
