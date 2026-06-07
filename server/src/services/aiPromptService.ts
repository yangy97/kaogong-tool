import type { ExamModule, ExamPoint } from '../types/index'
import { DIFFICULTY_LABELS } from '../constants'
import { getModulePromptHints } from '../data/modulePromptHints'
import { buildStrictDifficultyBlock, type Difficulty } from '../utils/difficultyConfig'
import { buildTuxingPromptIfNeeded } from '../data/tuxingAiSchema'
import { isTuxingTopicId } from '../types/tuxing'
import { buildAnswerDiversityPrompt } from '../utils/answerDiversify'

function buildAnalysisExample(
  moduleId: string,
  expert?: { analysisPrefix: string },
): string {
  const prefix = expert?.analysisPrefix ?? ''
  switch (moduleId) {
    case 'ziliao':
      return `${prefix}2023比重=27.8/97.6≈28.5%；2022比重=12.1/56.3≈21.5%；差≈7%，选D。`
    case 'shuliang':
      return `${prefix}设总量为1；效率比2:3→合作时间=1÷(1/2+1/3)=1.2；选B。`
    case 'panduan':
      return `${prefix}论点：咖啡→预防心脏病；A项说明是健康生活方式导致，另有他因削弱，选A。`
    case 'yanyu':
      return `${prefix}转折后强调生态保护，C项与主旨一致，选C。`
    case 'changshi':
      return `${prefix}《民法典》规定无民事行为能力人由法定代理人代理，选B。`
    default:
      return `${prefix}关键信息→结论，选X。`
  }
}

function buildJsonExample(
  module: ExamModule,
  difficulty: string,
  topic: ExamPoint | undefined,
  analysisExample: string,
): string {
  const isTuxing = isTuxingTopicId(topic?.id)
  const isEssay = module.id === 'shenlun'
  const isKongjian = topic?.id?.includes('kongjian')
  const isJiemian = topic?.id?.includes('jiemian')

  if (isTuxing) {
    if (isKongjian) {
      return `[{"type":"single","stem":"左边给定的是纸盒外表面的展开图，右边哪一项能由它折叠而成？","options":[{"key":"A","text":""},{"key":"B","text":""},{"key":"C","text":""},{"key":"D","text":""}],"answer":"A","analysis":"面2与面4为相对面不能同时出现，排除D；面1与面3公共边与箭头方向一致，选A","difficulty":"${difficulty}","tuxing":{"sequence":[{"kind":"net","faces":[{"id":1,"row":0,"col":1,"mark":"arrow-up"},{"id":2,"row":1,"col":1,"mark":"arrow-right"},{"id":3,"row":2,"col":1,"mark":"dot"},{"id":4,"row":1,"col":0},{"id":5,"row":1,"col":2,"mark":"arrow-up"},{"id":6,"row":1,"col":3,"mark":"dot"}]},{"kind":"net","faces":[...],"highlight":[2,4]},null],"options":[{"kind":"cube","top":"arrow-up","left":"arrow-right","right":"dot"},...]}}]`
    }
    if (isJiemian) {
      return `[{"type":"single","stem":"下列选项中，符合所给图形变化规律的是：","options":[{"key":"A","text":""},{"key":"B","text":""},{"key":"C","text":""},{"key":"D","text":""}],"answer":"A","analysis":"立方体过顶点截面为正三角形，选A","difficulty":"${difficulty}","tuxing":{"sequence":[{"kind":"voxel","cubes":[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]]},{"kind":"voxel","cubes":[[0,0,0],[1,0,0],[0,1,0],[1,1,0],[0,0,1],[1,0,1],[0,1,1],[1,1,1]],"showCut":true},null],"options":[{"kind":"polygon","polygons":[{"points":[[50,18],[22,78],[78,78]]}]},...]}}]`
    }
    return `[{"type":"single","stem":"下列选项中，符合所给图形变化规律的是：","options":[{"key":"A","text":""},{"key":"B","text":""},{"key":"C","text":""},{"key":"D","text":""}],"answer":"B","analysis":"规律+选X","difficulty":"${difficulty}","tuxing":{"sequence":[...],"options":[...]}}]`
  }

  if (isEssay) {
    return `[{"type":"essay","stem":"设问…","answer":"参考答案要点…","analysis":"采分点…","difficulty":"${difficulty}"}]`
  }

  if (module.id === 'ziliao') {
    return `[{"type":"single","stem":"| 年份 | 营收(亿元) | 线上占比 |\\n| 2022 | 56.3 | 12.1% |\\n| 2023 | 97.6 | 27.8% |\\n\\n2023年线上营收比2022年约多多少个百分点？","options":[{"key":"A","text":"5.2"},{"key":"B","text":"7.6"},{"key":"C","text":"9.1"},{"key":"D","text":"11.4"}],"answer":"D","analysis":"${analysisExample}","difficulty":"${difficulty}"}]`
  }

  if (module.id === 'panduan') {
    return `[{"type":"single","stem":"研究发现，每天饮用咖啡的人患心脏病比例更低。有人认为喝咖啡有助于预防心脏病。以下哪项最能削弱？","options":[{"key":"A","text":"喝咖啡者更注重健康饮食和锻炼"},{"key":"B","text":"咖啡含咖啡因，过量会心悸"},{"key":"C","text":"不喝咖啡者年龄普遍更大"},{"key":"D","text":"部分咖啡含大量糖分"}],"answer":"A","analysis":"${analysisExample}","difficulty":"${difficulty}"}]`
  }

  if (module.id === 'shuliang') {
    return `[{"type":"single","stem":"甲单独完成需6天，乙单独完成需8天。两人合作完成需多少天？","options":[{"key":"A","text":"3"},{"key":"B","text":"3.4"},{"key":"C","text":"4"},{"key":"D","text":"4.8"}],"answer":"B","analysis":"${analysisExample}","difficulty":"${difficulty}"}]`
  }

  if (module.id === 'yanyu') {
    return `[{"type":"single","stem":"湿地被称为地球之肾。然而近年来围垦开发导致湿地面积锐减……（文段80字以上）\\n\\n这段文字意在说明：","options":[{"key":"A","text":"湿地具有重要生态功能"},{"key":"B","text":"应加强湿地保护"},{"key":"C","text":"围垦开发危害巨大"},{"key":"D","text":"湿地面积不断减少"}],"answer":"B","analysis":"${analysisExample}","difficulty":"${difficulty}"}]`
  }

  return `[{"type":"single","stem":"题干","options":[{"key":"A","text":"…"},{"key":"B","text":"…"},{"key":"C","text":"…"},{"key":"D","text":"…"}],"answer":"A","analysis":"${analysisExample}","difficulty":"${difficulty}"}]`
}

export function buildAiPrompt(
  module: ExamModule,
  count: number,
  difficulty: string,
  topic?: ExamPoint,
  expert?: { analysisPrefix: string; publishLabel?: string },
): string {
  const isTuxing = isTuxingTopicId(topic?.id)
  const isEssay = module.id === 'shenlun'
  const analysisExample = buildAnalysisExample(module.id, expert)
  const jsonExample = buildJsonExample(module, difficulty, topic, analysisExample)

  const lines = [
    `生成 ${count} 道${DIFFICULTY_LABELS[difficulty] ?? difficulty}难度「${module.name}」题。`,
    getModulePromptHints(module, difficulty, topic),
    buildStrictDifficultyBlock(difficulty as Difficulty, module.name).replace(/\s+/g, ' ').trim(),
    isTuxing ? buildTuxingPromptIfNeeded(topic?.id, count) : '',
    !isEssay && count > 1 ? buildAnswerDiversityPrompt(count) : '',
    module.id === 'ziliao' ? '资料 stem：表格与设问分行，设问禁止写在表格最后一格或额外列。' : '',
    module.id === 'panduan' && !isTuxing
      ? '判断推理禁止出资料分析/数量关系题：不得出现增长率、比重、同比环比、亿元万元营收、人口连续增长等纯计算情境；须为逻辑论证/定义判断/类比/分析推理/翻译推理等判断题型。'
      : '',
    '只输出 JSON 数组，无 markdown、无解释。stem 表格用 \\n 换行；字符串内双引号须写成 \\"，禁止未转义换行。',
    `格式：${jsonExample}`,
  ]

  return lines.filter(Boolean).join('\n')
}
