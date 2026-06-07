import type { ExamModule, ExamPoint } from '../types/index'
import { ANALYSIS_PROMPT_RULES } from '../utils/analysisNormalize'
import type { ExamExpert } from './expertStyles'

const MODULE_SYSTEM_EXTRAS: Record<string, string> = {
  ziliao: '资料分析：完整材料表格+多步计算，禁止一步口算。',
  yanyu: '言语：文段完整、选项语义接近，禁止原文即答案。',
  shuliang: '数量：情境真实需列式，禁止纯观察秒杀。',
  panduan: '判断推理：定义/类比/逻辑论证/分析推理等题型；禁止资料分析式表格计算、禁止数量关系应用题。',
  changshi: '常识：考点准确，干扰项为易混知识点。',
  shenlun: '申论：材料与设问贴近真题，要点可评分。',
}

/** 系统 prompt：稳定内容放这里，便于 DeepSeek 前缀缓存命中 */
const BATCH_ANSWER_RULE =
  '一次输出多道四选一单选题时：各题 answer 字母须分散（禁止全部相同），设计题目时直接把各题正确答案落在不同选项位（如 A、C、D），options、analysis 与 answer 字段保持一致。'

export function buildModuleSystemPrompt(module: ExamModule, expert?: ExamExpert): string {
  const parts = [
    `你是公考${module.name}命题专家。${MODULE_SYSTEM_EXTRAS[module.id] ?? ''}`,
    BATCH_ANSWER_RULE,
    ANALYSIS_PROMPT_RULES,
    getModuleBaseHints(module.id),
  ]
  if (expert) {
    parts.push(`解析风格 · ${expert.name}：${expert.stylePrompt} analysis 以「${expert.analysisPrefix}」开头。`)
  }
  return parts.filter(Boolean).join('\n')
}

function getModuleBaseHints(moduleId: string): string {
  switch (moduleId) {
    case 'ziliao':
      return '资料：表格 Markdown 每行换行，≥4行3列，≥2步计算，选项差1-3个百分点。'
    case 'yanyu':
      return '言语：文段80-300字，干扰项语义接近。'
    case 'shuliang':
      return '数量：题干需列式，数字避免过于整齐。'
    case 'panduan':
      return '判断：图形题返回 tuxing JSON；非图形题为逻辑/定义/类比/匹配排序；严禁增长率/比重/营收/人口统计等资料计算题。'
    case 'changshi':
      return '常识：表述准确，干扰项为易混点。'
    case 'shenlun':
      return '申论：附材料，答案分条，type=essay。'
    default:
      return '四选项势均力敌，禁止送分题。'
  }
}

/** 用户 prompt 补充：仅放随请求变化的考点/难度信息 */
export function getModulePromptHints(
  module: ExamModule,
  difficulty: string,
  topic?: ExamPoint,
): string {
  const diff = difficultyNote(difficulty)
  const topicLine = topic ? `考点「${topic.name}」：${topic.description}` : ''
  const extras: string[] = [topicLine, diff]

  if (module.id === 'panduan' && topic?.id.includes('tuxing')) {
    extras.push('本题必须含 tuxing 字段')
  }
  if (module.id === 'panduan' && !topic) {
    extras.push('未指定考点时从定义判断/类比推理/加强削弱/分析推理/翻译推理中随机选取，禁止出资料计算题')
  }
  if (module.id === 'ziliao') {
    extras.push('stem 含 Markdown 表格')
  }

  return extras.filter(Boolean).join('；')
}

function difficultyNote(difficulty: string): string {
  if (difficulty === 'hard') return '难度 hard：≥2 步推理'
  if (difficulty === 'easy') return '难度 easy：入门但仍需读题'
  return '难度 medium：真题常规'
}

/** @deprecated 使用 difficultyConfig.getAiTemperature */
export function getModuleTemperature(moduleId: string): number {
  const map: Record<string, number> = {
    ziliao: 0.72,
    yanyu: 0.68,
    shuliang: 0.62,
    panduan: 0.62,
    changshi: 0.58,
    shenlun: 0.65,
  }
  return map[moduleId] ?? 0.55
}
