/** 公考名师解题风格（用于 AI 解析 prompt 与题目标签） */

export interface ExamExpert {
  id: string
  name: string
  /** 擅长模块 id，空数组表示行测通用 */
  modules: string[]
  specialty: string
  /** 解析开头标识 */
  analysisPrefix: string
  /** 注入 AI 的风格说明 */
  stylePrompt: string
}

export const EXAM_EXPERTS: ExamExpert[] = [
  {
    id: 'huasheng13',
    name: '花生十三',
    modules: ['shuliang', 'ziliao'],
    specialty: '数量·资料速算',
    analysisPrefix: '【花生十三·速算思路】',
    stylePrompt: `模仿「花生十三」速算：用分号列出 2-3 个关键式子及结果，最后一句结论+选X。禁止逐步试算、禁止「115法：…不对」式纠错。`,
  },
  {
    id: 'gaozhao',
    name: '高照',
    modules: ['ziliao'],
    specialty: '资料分析放缩',
    analysisPrefix: '【高照·资料速解】',
    stylePrompt: `只用「高照」放缩/截位直除/3+2 速算中的一种，1-2 句直达答案。先点公式再写估算结果，禁止多种方法对比和冗长竖式。`,
  },
  {
    id: 'niejia',
    name: '聂佳',
    modules: ['panduan'],
    specialty: '判断推理',
    analysisPrefix: '【聂佳·判断思路】',
    stylePrompt: `只用「聂佳」一种判断套路，1-2 句说明突破口并给出选项。禁止分点罗列多种思路。`,
  },
  {
    id: 'longfei',
    name: '龙飞',
    modules: ['panduan'],
    specialty: '图形·定义',
    analysisPrefix: '【龙飞·推理思路】',
    stylePrompt: `只用「龙飞」一种拆解法，1-2 句点关键特征并选答案。禁止展开多种规律假设。`,
  },
  {
    id: 'alimujiang',
    name: '阿里木江',
    modules: ['yanyu'],
    specialty: '言语理解',
    analysisPrefix: '【阿里木江·言语思路】',
    stylePrompt: `只用「阿里木江」一种排除/定位法，1-2 句说明为何选该答案。禁止空泛点评。`,
  },
  {
    id: 'guoxi',
    name: '郭熙',
    modules: ['yanyu'],
    specialty: '行文脉络',
    analysisPrefix: '【郭熙·言语思路】',
    stylePrompt: `只用「郭熙」行文脉络/定位法一种，1-2 句点结构并选答案。`,
  },
  {
    id: 'limengjiao',
    name: '李梦娇',
    modules: ['changshi'],
    specialty: '常识口诀',
    analysisPrefix: '【李梦娇·常识思路】',
    stylePrompt: `只用「李梦娇」口诀/易混点对比一种，1-2 句点考点并选答案。`,
  },
  {
    id: 'liuwenchao',
    name: '刘文超',
    modules: ['shuliang'],
    specialty: '数量秒杀',
    analysisPrefix: '【刘文超·数量思路】',
    stylePrompt: `只用「刘文超」代入/倍数/比例法一种，1-2 句秒杀并选答案。禁止完整演算。`,
  },
  {
    id: 'bailu',
    name: '白鹭',
    modules: ['shenlun'],
    specialty: '申论答题',
    analysisPrefix: '【白鹭·申论思路】',
    stylePrompt: `只用「白鹭」一种答题框架，1-2 句列要点方向。禁止长篇展开。`,
  },
]

export function getExpertById(id: string | undefined): ExamExpert | undefined {
  if (!id || id === 'none') return undefined
  return EXAM_EXPERTS.find((e) => e.id === id)
}

/** 按模块筛选名师，推荐项排前 */
export function getExpertsForModule(moduleId: string): Array<ExamExpert & { recommended: boolean }> {
  return EXAM_EXPERTS.map((e) => ({
    ...e,
    recommended: e.modules.length === 0 || e.modules.includes(moduleId),
  })).sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1
    return 0
  })
}
