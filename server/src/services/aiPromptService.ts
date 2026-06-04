import type { ExamModule, ExamPoint } from '../types/index'
import { DIFFICULTY_LABELS } from '../constants'
import { getModulePromptHints } from '../data/modulePromptHints'
import { buildStrictDifficultyBlock, type Difficulty } from '../utils/difficultyConfig'
import { buildTuxingPromptIfNeeded } from '../data/tuxingAiSchema'
import { isTuxingTopicId } from '../types/tuxing'
import { buildAnswerDiversityPrompt } from '../utils/answerDiversify'

export function buildAiPrompt(
  module: ExamModule,
  count: number,
  difficulty: string,
  topic?: ExamPoint,
  expert?: { analysisPrefix: string; publishLabel?: string },
): string {
  const isTuxing = isTuxingTopicId(topic?.id)
  const isEssay = module.id === 'shenlun'

  const analysisExample = expert?.analysisPrefix
    ? `${expert.analysisPrefix}2023比重=27.8/97.6≈28.5%；2022比重=12.1/56.3≈21.5%；差≈7%，选D。`
    : '2023比重≈28.5%；2022比重≈21.5%；差≈7%，选D。'

  const jsonExample = isTuxing
    ? `[{"type":"single","stem":"下列选项中，符合所给图形变化规律的是：","options":[{"key":"A","text":""},{"key":"B","text":""},{"key":"C","text":""},{"key":"D","text":""}],"answer":"B","analysis":"规律+选X","difficulty":"${difficulty}","tuxing":{"sequence":[...],"options":[...]}}]`
    : isEssay
      ? `[{"type":"essay","stem":"设问…","answer":"参考答案要点…","analysis":"采分点…","difficulty":"${difficulty}"}]`
      : `[{"type":"single","stem":"题干","options":[{"key":"A","text":"…"},{"key":"B","text":"…"},{"key":"C","text":"…"},{"key":"D","text":"…"}],"answer":"A","analysis":"${analysisExample}","difficulty":"${difficulty}"}]`

  const lines = [
    `生成 ${count} 道${DIFFICULTY_LABELS[difficulty] ?? difficulty}难度「${module.name}」题。`,
    getModulePromptHints(module, difficulty, topic),
    buildStrictDifficultyBlock(difficulty as Difficulty, module.name).replace(/\s+/g, ' ').trim(),
    isTuxing ? buildTuxingPromptIfNeeded(topic?.id) : '',
    !isEssay && count > 1 ? buildAnswerDiversityPrompt(count) : '',
    module.id === 'ziliao' ? '资料 stem：表格与设问分行，设问禁止写在表格最后一格或额外列。' : '',
    '只输出 JSON 数组，无 markdown、无解释。stem 表格用 \\n 换行；字符串内双引号须写成 \\"，禁止未转义换行。',
    `格式：${jsonExample}`,
  ]

  return lines.filter(Boolean).join('\n')
}
