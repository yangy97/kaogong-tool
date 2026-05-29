/** 公考名师解题风格（AI prompt 用真实风格；配图发布时由前端替换为 🐑🍊 品牌标签） */

export interface ExamExpert {
  id: string
  /** 名师名（AI / 选题 UI） */
  name: string
  /** 配图发布用思路名，不含人名，如「速算思路」 */
  publishLabel: string
  modules: string[]
  specialty: string
  analysisPrefix: string
  stylePrompt: string
}

export const EXAM_EXPERTS: ExamExpert[] = [
  {
    id: 'huasheng13',
    name: '花生十三',
    publishLabel: '速算思路',
    modules: ['shuliang', 'ziliao'],
    specialty: '数量·资料速算',
    analysisPrefix: '【花生十三·速算思路】',
    stylePrompt: `模仿「花生十三」速算：分号列 2-3 个关键式子及结果，末尾选X。禁止逐步试算纠错。`,
  },
  {
    id: 'gaozhao',
    name: '高照',
    publishLabel: '资料速解',
    modules: ['ziliao'],
    specialty: '资料分析放缩',
    analysisPrefix: '【高照·资料速解】',
    stylePrompt: `模仿「高照」放缩/截位直除：先公式再估算，1-2 句选X。`,
  },
  {
    id: 'niejia',
    name: '聂佳',
    publishLabel: '判断思路',
    modules: ['panduan'],
    specialty: '判断推理',
    analysisPrefix: '【聂佳·判断思路】',
    stylePrompt: `模仿「聂佳」判断套路，1-2 句点突破口并选X。`,
  },
  {
    id: 'longfei',
    name: '龙飞',
    publishLabel: '推理思路',
    modules: ['panduan'],
    specialty: '图形·定义',
    analysisPrefix: '【龙飞·推理思路】',
    stylePrompt: `模仿「龙飞」拆解法，1-2 句点关键特征并选X。`,
  },
  {
    id: 'alimujiang',
    name: '阿里木江',
    publishLabel: '言语思路',
    modules: ['yanyu'],
    specialty: '言语理解',
    analysisPrefix: '【阿里木江·言语思路】',
    stylePrompt: `模仿「阿里木江」排除/定位法，1-2 句说明为何选该答案。`,
  },
  {
    id: 'guoxi',
    name: '郭熙',
    publishLabel: '言语思路',
    modules: ['yanyu'],
    specialty: '行文脉络',
    analysisPrefix: '【郭熙·言语思路】',
    stylePrompt: `模仿「郭熙」行文脉络/定位法，1-2 句点结构并选答案。`,
  },
  {
    id: 'limengjiao',
    name: '李梦娇',
    publishLabel: '常识思路',
    modules: ['changshi'],
    specialty: '常识口诀',
    analysisPrefix: '【李梦娇·常识思路】',
    stylePrompt: `模仿「李梦娇」口诀/易混点对比，1-2 句点考点并选X。`,
  },
  {
    id: 'liuwenchao',
    name: '刘文超',
    publishLabel: '数量思路',
    modules: ['shuliang'],
    specialty: '数量秒杀',
    analysisPrefix: '【刘文超·数量思路】',
    stylePrompt: `模仿「刘文超」代入/比例法，1-2 句秒杀并选X。禁止完整演算。`,
  },
  {
    id: 'bailu',
    name: '白鹭',
    publishLabel: '申论思路',
    modules: ['shenlun'],
    specialty: '申论答题',
    analysisPrefix: '【白鹭·申论思路】',
    stylePrompt: `模仿「白鹭」答题框架，1-2 句列要点方向。`,
  },
]

const LEGACY_ID_MAP: Record<string, string> = {
  susuan: 'huasheng13',
  fangsu: 'gaozhao',
  panduan: 'niejia',
  tuxing: 'longfei',
  yanyu: 'alimujiang',
  xingwen: 'guoxi',
  changshi: 'limengjiao',
  shuliang: 'liuwenchao',
  shenlun: 'bailu',
}

export function getExpertById(id: string | undefined): ExamExpert | undefined {
  if (!id || id === 'none') return undefined
  const resolved = LEGACY_ID_MAP[id] ?? id
  return EXAM_EXPERTS.find((e) => e.id === resolved)
}

export function getExpertsForModule(moduleId: string): Array<ExamExpert & { recommended: boolean }> {
  return EXAM_EXPERTS.map((e) => ({
    ...e,
    recommended: e.modules.length === 0 || e.modules.includes(moduleId),
  })).sort((a, b) => {
    if (a.recommended !== b.recommended) return a.recommended ? -1 : 1
    return 0
  })
}
