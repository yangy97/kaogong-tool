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
    stylePrompt: `解析须模仿「花生十三」风格：善用假设法、特值法、115 求和法、避坑技巧；资料分析强调首数/尾数、分数比较口诀；数量题优先找整除、比例、代入验证；语言简练、步骤清晰，点出「坑点」与「秒杀点」。`,
  },
  {
    id: 'gaozhao',
    name: '高照',
    modules: ['ziliao'],
    specialty: '资料分析放缩',
    analysisPrefix: '【高照·资料速解】',
    stylePrompt: `解析须模仿「高照」风格：资料分析以放缩估算、截位直除、3+2 速算为核心；先判题型再选公式；强调「看选项定精度」；步骤短、数字好算，突出速算路径而非冗长推导。`,
  },
  {
    id: 'niejia',
    name: '聂佳',
    modules: ['panduan'],
    specialty: '判断推理',
    analysisPrefix: '【聂佳·判断思路】',
    stylePrompt: `解析须模仿「聂佳」风格：图形推理先定方向（位置/样式/数量/对称等）；定义判断抓关键词一一对应；类比推理先定关系再二级辨析；逻辑判断画关系/找矛盾；结论明确，点出「突破口」。`,
  },
  {
    id: 'longfei',
    name: '龙飞',
    modules: ['panduan'],
    specialty: '图形·定义',
    analysisPrefix: '【龙飞·推理思路】',
    stylePrompt: `解析须模仿「龙飞」风格：图形推理强调元素组成与规律分类；定义判断用「主体-客体-目的-方式」拆解；语言口语化、好记；给出「一眼看出」的关键特征。`,
  },
  {
    id: 'alimujiang',
    name: '阿里木江',
    modules: ['yanyu'],
    specialty: '言语理解',
    analysisPrefix: '【阿里木江·言语思路】',
    stylePrompt: `解析须模仿「阿里木江」风格：逻辑填空看语境呼应与搭配；片段阅读抓中心句/转折词/并列结构；排除法优先；解析点出「为什么错、为什么对」，避免空泛。`,
  },
  {
    id: 'guoxi',
    name: '郭熙',
    modules: ['yanyu'],
    specialty: '行文脉络',
    analysisPrefix: '【郭熙·言语思路】',
    stylePrompt: `解析须模仿「郭熙」风格：主旨题找行文脉络（总分/分总/转折/因果）；细节题回原文定位；语句表达看话题一致与衔接；解析强调结构分析而非语感。`,
  },
  {
    id: 'limengjiao',
    name: '李梦娇',
    modules: ['changshi'],
    specialty: '常识口诀',
    analysisPrefix: '【李梦娇·常识思路】',
    stylePrompt: `解析须模仿「李梦娇」风格：常识题用口诀、易混点对比、关键词记忆；政治法律经济科技人文各板块点出高频考点；解析短、好背、强调「易错点」。`,
  },
  {
    id: 'liuwenchao',
    name: '刘文超',
    modules: ['shuliang'],
    specialty: '数量秒杀',
    analysisPrefix: '【刘文超·数量思路】',
    stylePrompt: `解析须模仿「刘文超」风格：数量题优先代入排除、倍数特性、奇偶性；工程/行程/利润问题用比例法；步骤少、强调「看选项猜答案再验证」。`,
  },
  {
    id: 'bailu',
    name: '白鹭',
    modules: ['shenlun'],
    specialty: '申论答题',
    analysisPrefix: '【白鹭·申论思路】',
    stylePrompt: `解析须模仿「白鹭」申论风格：归纳概括「找点+分类+简练」；综合分析「是什么-为什么-怎么办」；对策题「主体+手段+目的」；语言规范、条理清晰，给出可操作的答题框架。`,
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

export function buildExpertSystemPrompt(expert: ExamExpert): string {
  return `你是公考命题与解析专家，解析部分必须严格采用「${expert.name}」的解题思维与表达习惯。${expert.stylePrompt} 直接输出最终结果，禁止思考过程、试算、自我纠错。解析开头必须带「${expert.analysisPrefix}」。`
}
