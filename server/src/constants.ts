import type { ExamPoint, ExamModule } from '../types/index.js'

export const EXAM_MODULES: ExamModule[] = [
  {
    id: 'yanyu',
    name: '言语理解与表达',
    category: '行测',
    description: '逻辑填空、片段阅读、语句表达',
  },
  {
    id: 'shuliang',
    name: '数量关系',
    category: '行测',
    description: '数学运算、数字推理',
  },
  {
    id: 'panduan',
    name: '判断推理',
    category: '行测',
    description: '图形推理、定义判断、类比推理、逻辑判断',
  },
  {
    id: 'ziliao',
    name: '资料分析',
    category: '行测',
    description: '增长率、比重、平均数等数据分析',
  },
  {
    id: 'changshi',
    name: '常识判断',
    category: '行测',
    description: '政治、法律、经济、科技、人文',
  },
  {
    id: 'shenlun',
    name: '申论',
    category: '申论',
    description: '归纳概括、综合分析、提出对策、应用文写作',
  },
  {
    id: 'words700',
    name: '700高频词',
    category: '词汇',
    description: '高频成语、实词辨析、易混词语、关联词',
  },
]

export const EXAM_POINTS: ExamPoint[] = [
  // 言语
  { id: 'yanyu-luoji', moduleId: 'yanyu', name: '逻辑填空', description: '语境分析、词语搭配、感情色彩' },
  { id: 'yanyu-zhuzhi', moduleId: 'yanyu', name: '主旨概括', description: '中心思想、标题填入' },
  { id: 'yanyu-xijie', moduleId: 'yanyu', name: '细节理解', description: '信息匹配、正误判断' },
  { id: 'yanyu-yitu', moduleId: 'yanyu', name: '意图判断', description: '作者目的、言外之意' },
  { id: 'yanyu-paixu', moduleId: 'yanyu', name: '语句排序', description: '句间逻辑、首尾捆绑' },
  { id: 'yanyu-tiankong', moduleId: 'yanyu', name: '语句填空', description: '上下文衔接、话题一致' },
  { id: 'yanyu-xiawen', moduleId: 'yanyu', name: '下文推断', description: '尾句分析、逻辑延续' },

  // 数量
  { id: 'shuliang-gongcheng', moduleId: 'shuliang', name: '工程问题', description: '工作效率、合作完工' },
  { id: 'shuliang-xingcheng', moduleId: 'shuliang', name: '行程问题', description: '相遇追及、流水行船' },
  { id: 'shuliang-lirun', moduleId: 'shuliang', name: '利润问题', description: '成本定价、折扣促销' },
  { id: 'shuliang-pailie', moduleId: 'shuliang', name: '排列组合', description: '计数原理、分步分类' },
  { id: 'shuliang-gailv', moduleId: 'shuliang', name: '概率问题', description: '古典概型、独立事件' },
  { id: 'shuliang-jihe', moduleId: 'shuliang', name: '几何问题', description: '平面几何、立体几何' },
  { id: 'shuliang-rongchi', moduleId: 'shuliang', name: '容斥原理', description: '两集合、三集合容斥' },
  { id: 'shuliang-shulie', moduleId: 'shuliang', name: '数列推理', description: '等差等比、递推规律' },

  // 判断
  { id: 'panduan-tuxing-shuliang', moduleId: 'panduan', name: '图形推理-数量', description: '点线角面素数量变化' },
  { id: 'panduan-tuxing-weizhi', moduleId: 'panduan', name: '图形推理-位置', description: '平移旋转翻转' },
  { id: 'panduan-tuxing-yangshi', moduleId: 'panduan', name: '图形推理-样式', description: '叠加遍历对称' },
  { id: 'panduan-dingyi', moduleId: 'panduan', name: '定义判断', description: '关键词提取、属种关系' },
  { id: 'panduan-leibi', moduleId: 'panduan', name: '类比推理', description: '词项关系、二级辨析' },
  { id: 'panduan-fanyi', moduleId: 'panduan', name: '翻译推理', description: '假言联言选言命题' },
  { id: 'panduan-zhenjia', moduleId: 'panduan', name: '真假推理', description: '矛盾关系、假设法' },
  { id: 'panduan-jiaqiang', moduleId: 'panduan', name: '加强削弱', description: '论证分析、前提结论' },

  // 资料
  { id: 'ziliao-zengzhanglv', moduleId: 'ziliao', name: '增长率', description: '同比环比、一般增长率' },
  { id: 'ziliao-zengzhangliang', moduleId: 'ziliao', name: '增长量', description: '增长量计算与比较' },
  { id: 'ziliao-bizhong', moduleId: 'ziliao', name: '比重', description: '现期比重、基期比重' },
  { id: 'ziliao-pingjun', moduleId: 'ziliao', name: '平均数', description: '平均数增长率、两期平均' },
  { id: 'ziliao-beishu', moduleId: 'ziliao', name: '倍数', description: '倍数计算、翻番' },
  { id: 'ziliao-jiange', moduleId: 'ziliao', name: '间隔增长率', description: '隔年增长率公式' },
  { id: 'ziliao-hunhe', moduleId: 'ziliao', name: '混合增长率', description: '十字交叉、线段法' },
  { id: 'ziliao-jiqi', moduleId: 'ziliao', name: '基期与现期', description: '基期量、现期量求解' },
  { id: 'ziliao-zonghe', moduleId: 'ziliao', name: '综合分析', description: '多材料综合判断' },
  { id: 'ziliao-susuan-shouwei', moduleId: 'ziliao', name: '首数/尾数法', description: '看首位或末位快速估算' },
  { id: 'ziliao-susuan-baifen', moduleId: 'ziliao', name: '百分数转化', description: '分数与百分数互换速算' },
  { id: 'ziliao-susuan-fangsu', moduleId: 'ziliao', name: '放缩估算', description: '放大缩小凑整速算' },
  { id: 'ziliao-susuan-bijiao', moduleId: 'ziliao', name: '速算比大小', description: '直除/交叉相乘比较' },

  // 常识
  { id: 'changshi-zhengzhi', moduleId: 'changshi', name: '政治', description: '时政热点、党史理论' },
  { id: 'changshi-falv', moduleId: 'changshi', name: '法律', description: '宪法行政法民法等' },
  { id: 'changshi-jingji', moduleId: 'changshi', name: '经济', description: '宏观经济、市场经济' },
  { id: 'changshi-lishi', moduleId: 'changshi', name: '历史人文', description: '中国古代史、文化常识' },
  { id: 'changshi-keji', moduleId: 'changshi', name: '科技', description: '前沿科技、生活科学' },
  { id: 'changshi-dili', moduleId: 'changshi', name: '地理', description: '自然地理、国情地理' },

  // 申论
  { id: 'shenlun-guina', moduleId: 'shenlun', name: '归纳概括', description: '提炼要点、分类整合' },
  { id: 'shenlun-zonghe', moduleId: 'shenlun', name: '综合分析', description: '词句理解、观点评价' },
  { id: 'shenlun-duice', moduleId: 'shenlun', name: '提出对策', description: '问题对策、可行性分析' },
  { id: 'shenlun-guanli', moduleId: 'shenlun', name: '贯彻执行', description: '公文写作、格式规范' },
  { id: 'shenlun-lunshu', moduleId: 'shenlun', name: '申发论述', description: '大作文、论点论据' },
]

export const MODULE_MAP = Object.fromEntries(
  EXAM_MODULES.map((m) => [m.id, m]),
) as Record<string, ExamModule>

export const EXAM_POINT_MAP = Object.fromEntries(
  EXAM_POINTS.map((p) => [p.id, p]),
) as Record<string, ExamPoint>

export function getPointsByModule(moduleId: string): ExamPoint[] {
  return EXAM_POINTS.filter((p) => p.moduleId === moduleId)
}

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
}

export const XHS_CREATOR_URL = 'https://creator.xiaohongshu.com/publish/publish?source=official'

export const DOUYIN_CREATOR_URL = 'https://creator.douyin.com/creator-micro/content/upload'

export const DEFAULT_TAGS = ['考公', '公务员考试', '行测', '公考刷题', '上岸']

export const DOUYIN_TAGS = ['考公', '公务员考试', '行测', '公考刷题', '考公上岸', '公务员']
