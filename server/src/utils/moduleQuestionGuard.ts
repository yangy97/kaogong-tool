/** 检测 AI 是否把其他模块题型混入当前模块 */

const ZILIAO_STEM_RE =
  /(?:增长率|增速|同比|环比|比重|占比|个百分点|营收|收入|利润|亿元|万元|万人|人口.*增长|线上业务|表格)/

const PANDUAN_STEM_RE =
  /(?:以下哪项|最能削弱|最能加强|前提|假设|由此可以推出|定义|属于.*的是|类比|如果.*那么|只有.*才|除非)/

export function looksLikeZiliaoQuestion(stem: string, analysis?: string): boolean {
  const text = `${stem}\n${analysis ?? ''}`
  if (/\|.+\|/.test(stem)) return true
  const hits = (text.match(ZILIAO_STEM_RE) ?? []).length
  return hits >= 2 || (hits >= 1 && /%\s*[,，.。]|约多少|增长多少/.test(text))
}

export function panduanQuestionOffModule(stem: string, analysis?: string): boolean {
  if (looksLikeZiliaoQuestion(stem, analysis)) return true
  if (/单独完成需|合作完成|工程|行程|浓度|利润率/.test(stem)) return true
  return false
}

export function moduleMismatchHint(moduleId: string): string {
  if (moduleId === 'panduan') {
    return [
      '【重要纠错】上一批题目混入资料分析/数量计算，全部作废。',
      '请重新生成判断推理题：逻辑论证/定义判断/类比推理/分析推理/翻译推理等；',
      '禁止增长率、比重、营收、人口统计、工程行程等计算情境。',
      '题干须含「以下哪项/最能削弱/由此推出」等判断推理表述。',
    ]
      .filter(Boolean)
      .join('')
  }
  return '上一批题目与模块不符，请严格按模块要求重新生成。'
}
