import type { ExamModule, ExamPoint, Question } from '../types/index.js'
import { DIFFICULTY_LABELS, EXAM_POINTS } from '../constants.js'
import { generateParametric, shuffle } from './parametricService.js'

type TemplateItem = Omit<Question, 'id' | 'moduleId' | 'moduleName' | 'topicId' | 'topicName'>

const templateBank: Record<string, TemplateItem[]> = {
  'yanyu-luoji': [{
    type: 'single',
    stem: '依次填入画横线部分最恰当的一项是：在信息爆炸的时代，我们更需要具备______的能力，从海量信息中筛选出真正有价值的内容，而不是被______的信息所淹没。',
    options: [
      { key: 'A', text: '甄别  碎片化' },
      { key: 'B', text: '辨别  零散' },
      { key: 'C', text: '识别  片面' },
      { key: 'D', text: '分辨  冗余' },
    ],
    answer: 'A',
    analysis: '第一空"甄别"强调审查辨别；第二空"碎片化"与信息爆炸语境呼应。',
    difficulty: 'medium',
  }, {
    type: 'single',
    stem: '依次填入画横线部分最恰当的一项是：传统文化需要在传承中______，在创新中发展，既不能固步自封，也不能______历史。',
    options: [
      { key: 'A', text: '沉淀  遗忘' },
      { key: 'B', text: '积淀  割裂' },
      { key: 'C', text: '积累  抛弃' },
      { key: 'D', text: '沉积  背离' },
    ],
    answer: 'B',
    analysis: '"积淀"与"传承"搭配；第二空"割裂历史"表示切断联系，语义准确。',
    difficulty: 'medium',
  }, {
    type: 'single',
    stem: '依次填入画横线部分最恰当的一项是：面对复杂局面，需要保持战略______，不能因一时波动而______方向。',
    options: [
      { key: 'A', text: '定力  动摇' },
      { key: 'B', text: '耐心  改变' },
      { key: 'C', text: '自信  转换' },
      { key: 'D', text: '主动  放弃' },
    ],
    answer: 'A',
    analysis: '"战略定力"为常见搭配；"动摇方向"表示不稳定。',
    difficulty: 'easy',
  }],
  'yanyu-xijie': [{
    type: 'single',
    stem: '下列句子中，没有语病的一项是：',
    options: [
      { key: 'A', text: '通过这次学习，使我对公务员考试有了更深刻的认识。' },
      { key: 'B', text: '能否保持良好的心态，是考试成功的关键之一。' },
      { key: 'C', text: '他不但学习刻苦，而且成绩一直名列前茅。' },
      { key: 'D', text: '为了防止疫情不再反弹，我们仍要做好个人防护。' },
    ],
    answer: 'C',
    analysis: 'A 缺主语；B 两面对一面；D 双重否定语义错误。',
    difficulty: 'easy',
  }],
  'shuliang-gongcheng': [{
    type: 'single',
    stem: '一项工程，甲单独做需要 12 天，乙单独做需要 18 天。两人合作 4 天后，乙离开，甲又单独做了 3 天完成。问乙实际工作了几天？',
    options: [
      { key: 'A', text: '3 天' }, { key: 'B', text: '4 天' },
      { key: 'C', text: '5 天' }, { key: 'D', text: '6 天' },
    ],
    answer: 'B',
    analysis: '设总量 36，甲效率 3，乙效率 2，合作 4 天完成 20，余下由甲完成，乙工作 4 天。',
    difficulty: 'hard',
  }],
  'shuliang-xingcheng': [{
    type: 'single',
    stem: '甲、乙两人从相距 120 千米的两地同时出发相向而行，甲速度 40km/h，乙速度 20km/h，相遇后甲继续到乙地再返回，问两人第二次相遇时甲共行走了多少千米？',
    options: [
      { key: 'A', text: '160' }, { key: 'B', text: '180' },
      { key: 'C', text: '200' }, { key: 'D', text: '240' },
    ],
    answer: 'C',
    analysis: '第一次相遇用时 2h，甲走 80km；多次相遇问题可画示意图求解，答案 200km。',
    difficulty: 'hard',
  }],
  'panduan-leibi': [{
    type: 'single',
    stem: '类比推理：书籍 : 知识 :: 锻炼 : ?',
    options: [
      { key: 'A', text: '健康' }, { key: 'B', text: '运动' },
      { key: 'C', text: '身体' }, { key: 'D', text: '力量' },
    ],
    answer: 'A',
    analysis: '书籍是获取知识的途径，锻炼是获得健康的途径，逻辑一致。',
    difficulty: 'easy',
  }],
  'panduan-dingyi': [{
    type: 'single',
    stem: '行政授权是指上级行政机关授予下级行政机关管理有关事务的职权。下列属于行政授权的是：',
    options: [
      { key: 'A', text: '某县政府委托乡镇政府办理部分审批事项' },
      { key: 'B', text: '某市局长将本局日常事务交由副局长处理' },
      { key: 'C', text: '某高校将科研项目管理权下放至各学院' },
      { key: 'D', text: '某公司经理授权部门主管审批费用报销' },
    ],
    answer: 'A',
    analysis: '行政授权主体须为行政机关，A 符合；B 为内部授权；C、D 非行政机关。',
    difficulty: 'medium',
  }],
  'ziliao-zengzhanglv': [{
    type: 'single',
    stem: '2023 年某市 GDP 为 8000 亿元，2024 年 GDP 为 8640 亿元。则 2024 年同比增长率约为：',
    options: [
      { key: 'A', text: '6%' }, { key: 'B', text: '8%' },
      { key: 'C', text: '10%' }, { key: 'D', text: '12%' },
    ],
    answer: 'B',
    analysis: '增长率 = (8640-8000)/8000 = 8%。',
    difficulty: 'easy',
  }],
  'ziliao-bizhong': [{
    type: 'single',
    stem: '2024 年某行业总产值 5000 亿元，其中 A 企业产值 800 亿元。则 A 企业产值占行业总产值的比重为：',
    options: [
      { key: 'A', text: '14%' }, { key: 'B', text: '16%' },
      { key: 'C', text: '18%' }, { key: 'D', text: '20%' },
    ],
    answer: 'B',
    analysis: '比重 = 800/5000 = 16%。',
    difficulty: 'easy',
  }],
  'ziliao-pingjun': [{
    type: 'single',
    stem: '某市 2023 年进出口总额 1200 亿美元，2024 年为 1320 亿美元。则 2024 年平均每季度进出口额比 2023 年多：',
    options: [
      { key: 'A', text: '20 亿' }, { key: 'B', text: '25 亿' },
      { key: 'C', text: '30 亿' }, { key: 'D', text: '35 亿' },
    ],
    answer: 'C',
    analysis: '2024 每季度 330 亿，2023 每季度 300 亿，差 30 亿。',
    difficulty: 'medium',
  }],
  'ziliao-jiange': [{
    type: 'single',
    stem: '某产品 2022 年增长 10%，2023 年增长 20%。则 2023 年相对 2021 年的间隔增长率为：',
    options: [
      { key: 'A', text: '30%' }, { key: 'B', text: '32%' },
      { key: 'C', text: '34%' }, { key: 'D', text: '36%' },
    ],
    answer: 'B',
    analysis: '间隔增长率 ≈ 10%+20%+10%×20% = 32%。',
    difficulty: 'medium',
  }],
  'changshi-falv': [{
    type: 'single',
    stem: '下列关于我国宪法修改程序的说法，正确的是：',
    options: [
      { key: 'A', text: '由全国人大以全体代表的三分之二以上多数通过' },
      { key: 'B', text: '由全国人大常委会决定' },
      { key: 'C', text: '由国务院提出修正案' },
      { key: 'D', text: '由最高人民法院审查后公布' },
    ],
    answer: 'A',
    analysis: '宪法修改由全国人大常委会或 1/5 以上代表提议，全国人大 2/3 以上多数通过。',
    difficulty: 'medium',
  }],
  'changshi-zhengzhi': [{
    type: 'single',
    stem: '"绿水青山就是金山银山"的理念体现了：',
    options: [
      { key: 'A', text: '经济发展与环境保护的对立' },
      { key: 'B', text: '人与自然和谐共生的发展理念' },
      { key: 'C', text: '先污染后治理的路径' },
      { key: 'D', text: '环保优先于一切经济活动' },
    ],
    answer: 'B',
    analysis: '强调生态环境与经济发展统一，体现绿色发展理念。',
    difficulty: 'easy',
  }],
  'shenlun-guina': [{
    type: 'essay',
    stem: '请根据给定资料，概括当前基层社区治理中存在的主要问题。（不超过 200 字）',
    answer: '主要问题：治理主体单一、居民参与不足；资源配置不均衡；数字化水平低；权责不清、协同不畅；服务供给与需求不匹配。',
    analysis: '归纳概括题需分条提炼，涵盖主体、资源、技术、机制、服务等维度。',
    difficulty: 'medium',
  }],
  'shenlun-lunshu': [{
    type: 'essay',
    stem: '请以"提升公共服务的温度与精度"为主题，写一段开头。（不超过 150 字）',
    answer: '公共服务连接着千家万户的冷暖。从"最多跑一次"到"一网通办"，每一次升级都关乎群众获得感。然而部分服务仍缺温度与精度。唯有以需求为导向、以科技为支撑，才能让公共服务既暖人心又合民意。',
    analysis: '开头可用"背景+意义+问题+过渡"结构。',
    difficulty: 'hard',
  }],
}

const moduleFallback: Record<string, string> = {
  yanyu: 'yanyu-luoji',
  shuliang: 'shuliang-gongcheng',
  panduan: 'panduan-leibi',
  ziliao: 'ziliao-zengzhanglv',
  changshi: 'changshi-zhengzhi',
  shenlun: 'shenlun-guina',
}

function varyStem(stem: string): string {
  const prefixes = shuffle(['【每日一练】', '【刷题打卡】', '【公考精选】', '【🐑🍊打卡】', ''])
  return prefixes[0] ? `${prefixes[0]}${stem}` : stem
}

function getModulePool(moduleId: string): TemplateItem[] {
  const topicIds = EXAM_POINTS.filter((p) => p.moduleId === moduleId).map((p) => p.id)
  const items: TemplateItem[] = []
  for (const id of topicIds) {
    if (templateBank[id]) items.push(...templateBank[id])
  }
  return items.length > 0 ? items : (templateBank[moduleFallback[moduleId] ?? ''] ?? [])
}

function pickStaticPool(topicKey: string, moduleId: string, difficulty?: string): TemplateItem[] {
  const topicPool = templateBank[topicKey] ?? []
  const modulePool = getModulePool(moduleId)
  const pool = topicPool.length > 0 ? topicPool : modulePool
  const filtered = difficulty ? pool.filter((q) => q.difficulty === difficulty) : pool
  return filtered.length > 0 ? filtered : pool
}

export function generateFromTemplate(
  module: ExamModule,
  count: number,
  difficulty?: string,
  topic?: ExamPoint,
): Question[] {
  const topicKey = topic?.id ?? moduleFallback[module.id] ?? 'yanyu-luoji'
  const staticPool = shuffle(pickStaticPool(topicKey, module.id, difficulty))
  const results: Question[] = []
  let staticIdx = 0

  for (let i = 0; i < count; i++) {
    let base: TemplateItem | null = topic ? generateParametric(topic) : null

    // 静态题库：随机抽取，不重复用完后再循环
    if (!base && staticPool.length > 0) {
      base = staticPool[staticIdx % staticPool.length]
      staticIdx++
    }

    if (!base) {
      base = {
        type: 'single',
        stem: `【${topic?.name ?? module.name}】请结合该考点特点，分析下列表述的正确性。`,
        options: [
          { key: 'A', text: '表述正确' }, { key: 'B', text: '表述错误' },
          { key: 'C', text: '无法判断' }, { key: 'D', text: '与考点无关' },
        ],
        answer: 'A',
        analysis: `本题考查${topic?.name ?? module.name}，建议结合该考点核心公式与常见陷阱进行练习。`,
        difficulty: 'medium',
      }
    }

    results.push({
      id: `${topicKey}-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      moduleId: module.id,
      moduleName: module.name,
      topicId: topic?.id,
      topicName: topic?.name,
      ...base,
      stem: varyStem(base.stem),
    })
  }

  return results
}

export function buildAiPrompt(
  module: ExamModule,
  count: number,
  difficulty: string,
  topic?: ExamPoint,
  expert?: { name: string; analysisPrefix: string; stylePrompt: string },
): string {
  const typeHint =
    module.id === 'shenlun'
      ? '申论主观题，含题干、参考答案、答题思路'
      : '行测选择题，含题干、A/B/C/D 四个选项、正确答案、详细解析'

  const topicHint = topic
    ? `本次命制考点：「${topic.name}」（${topic.description}），所有题目必须紧扣该考点。`
    : ''

  const expertHint = expert
    ? `
【解析风格 · ${expert.name}】
${expert.stylePrompt}
- analysis 必须以「${expert.analysisPrefix}」开头
- 用 ${expert.name} 的标志性方法与话术讲解，2-4 句话，不超过 200 字
- 可点出「坑点」「秒杀点」「易错项」，但禁止输出思考/试算过程`
    : `
- analysis 字段：仅写最终解题结论和关键公式，1-3 句话，不超过 120 字
- 禁止在 analysis / stem 中出现：思考过程、试算、调整数字、自我质疑、「可能」「重新考虑」「完美」等措辞`

  return `你是资深公务员考试命题专家。请为「${module.name}」（${module.category}）生成 ${count} 道${DIFFICULTY_LABELS[difficulty] ?? difficulty}难度题目。
${topicHint}
模块说明：${module.description}
题型要求：${typeHint}

随机种子：${Date.now()}-${Math.random().toString(36).slice(2, 8)}
要求：每道题必须原创，数字、情境、选项不能与常见题库重复，每次生成不同的题目。

【重要】输出规范：
- 只输出 JSON，不要任何解释性文字
${expertHint}
- 禁止输出命题草稿或多版修改过程

严格返回 JSON 数组，不要 markdown 代码块，格式如下：
[
  {
    "type": "single",
    "stem": "题干（完整、可直接作答的最终版本）",
    "options": [{"key":"A","text":"..."},{"key":"B","text":"..."},{"key":"C","text":"..."},{"key":"D","text":"..."}],
    "answer": "A",
    "analysis": "解析${expert ? `（${expert.analysisPrefix}开头，${expert.name}风格）` : '（仅结论+公式，无思考过程）'}",
    "difficulty": "${difficulty}"
  }
]

申论题 type 为 "essay"，无 options 字段。题目应贴近最新考情，原创命题。`
}
