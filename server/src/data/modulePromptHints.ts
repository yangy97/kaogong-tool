import type { ExamModule, ExamPoint } from '../types/index.js'
import { ANALYSIS_PROMPT_RULES } from '../utils/analysisNormalize.js'
import type { ExamExpert } from './expertStyles.js'

const MODULE_SYSTEM_EXTRAS: Record<string, string> = {
  ziliao: '资料分析：完整材料表格+多步计算，禁止一步口算。',
  yanyu: '言语：文段完整、选项语义接近，禁止原文即答案。',
  shuliang: '数量：情境真实需列式，禁止纯观察秒杀。',
  panduan: '判断：干扰项看似正确但关键词不符。',
  changshi: '常识：考点准确，干扰项为易混知识点。',
  shenlun: '申论：材料与设问贴近真题，要点可评分。',
}

/** 系统 prompt：稳定内容放这里，便于 DeepSeek 前缀缓存命中 */
export function buildModuleSystemPrompt(module: ExamModule, expert?: ExamExpert): string {
  const parts = [
    `你是公考${module.name}命题专家。${MODULE_SYSTEM_EXTRAS[module.id] ?? ''}`,
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
      return '判断：图形题返回 tuxing JSON；其余干扰项关键词不符。'
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
