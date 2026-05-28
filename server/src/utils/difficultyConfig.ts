export type Difficulty = 'easy' | 'medium' | 'hard'

const TIER: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 }

export function difficultyTier(d: string): number {
  return TIER[d as Difficulty] ?? 1
}

/** 按请求难度筛选题库，优先精确匹配，不足时向邻近档位扩展 */
export function filterByDifficulty<T extends { difficulty: string }>(
  items: T[],
  requested: Difficulty,
): T[] {
  if (!items.length) return items
  const exact = items.filter((q) => q.difficulty === requested)
  if (exact.length) return exact

  const tier = difficultyTier(requested)
  if (requested === 'hard') {
    return items.filter((q) => difficultyTier(q.difficulty) >= 1)
  }
  if (requested === 'easy') {
    return items.filter((q) => difficultyTier(q.difficulty) <= 1)
  }
  return items.filter((q) => Math.abs(difficultyTier(q.difficulty) - tier) <= 1)
}

/** AI 出题强制难度约束 */
export function buildStrictDifficultyBlock(difficulty: Difficulty, moduleName: string): string {
  const common = `
【难度硬性要求 · ${difficulty}】
- JSON 中每题 difficulty 必须为 "${difficulty}"
- 禁止「一眼看出答案」：10 秒内可秒杀的题一律不合格
- 四个选项必须势均力敌，干扰项为「差一步/看错一处就会选错」的结果`

  if (difficulty === 'hard') {
    return `${common}
- ${moduleName}困难题标准：需 2 步以上推理，或细辨近义选项，接近省考/国考压轴
- 禁止：等差数列 1-2-3-4、整十整百口算、三项明显荒谬的选项
- 自检：新手 5 秒内能否做对？能 → 必须加难`
  }
  if (difficulty === 'easy') {
    return `${common}
- ${moduleName}简单题标准：入门练习，但仍需读题/列式，不可纯送分
- 禁止：无计算量、无阅读量的 trivial 题`
  }
  return `${common}
- ${moduleName}中等题标准：真题常规难度，限时 60-120 秒`
}

export function getAiTemperature(moduleId: string, difficulty: Difficulty): number {
  const base: Record<string, number> = {
    ziliao: 0.68,
    yanyu: 0.65,
    shuliang: 0.6,
    panduan: 0.6,
    changshi: 0.55,
    shenlun: 0.62,
  }
  const b = base[moduleId] ?? 0.55
  const boost = difficulty === 'hard' ? 0.1 : difficulty === 'medium' ? 0.05 : 0
  return Math.min(b + boost, 0.85)
}
