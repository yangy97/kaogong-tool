import type { ExamPoint, ExamModule } from './types/index'

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
  // ── 言语理解与表达 ──
  { id: 'yanyu-luoji', moduleId: 'yanyu', name: '逻辑填空', description: '语境分析、词语搭配、感情色彩' },
  { id: 'yanyu-shici', moduleId: 'yanyu', name: '实词辨析', description: '动词名词形容词、语义轻重' },
  { id: 'yanyu-chengyu', moduleId: 'yanyu', name: '成语辨析', description: '成语含义、易混成语、搭配对象' },
  { id: 'yanyu-zhuzhi', moduleId: 'yanyu', name: '主旨概括', description: '中心思想、行文脉络、重点句' },
  { id: 'yanyu-biaoti', moduleId: 'yanyu', name: '标题填入', description: '概括性、针对性、生动性' },
  { id: 'yanyu-yitu', moduleId: 'yanyu', name: '意图判断', description: '作者目的、言外之意、呼吁建议' },
  { id: 'yanyu-xijie', moduleId: 'yanyu', name: '细节理解', description: '信息匹配、正误判断、偷换概念' },
  { id: 'yanyu-taidu', moduleId: 'yanyu', name: '态度观点', description: '作者立场、情感倾向、评价判断' },
  { id: 'yanyu-ciju', moduleId: 'yanyu', name: '词句理解', description: '指代词、关键词、比喻义' },
  { id: 'yanyu-paixu', moduleId: 'yanyu', name: '语句排序', description: '句间逻辑、首尾捆绑、指代词' },
  { id: 'yanyu-tiankong', moduleId: 'yanyu', name: '语句填空', description: '上下文衔接、话题一致、关联词' },
  { id: 'yanyu-xiawen', moduleId: 'yanyu', name: '下文推断', description: '尾句分析、逻辑延续、话题转换' },
  { id: 'yanyu-jieyu', moduleId: 'yanyu', name: '接语选择', description: '尾句话题、承上启下、排除法' },
  { id: 'yanyu-xingwen', moduleId: 'yanyu', name: '行文脉络', description: '总分总、并列、转折、因果结构' },

  // ── 数量关系 ──
  { id: 'shuliang-gongcheng', moduleId: 'shuliang', name: '工程问题', description: '工作效率、合作完工、交替施工' },
  { id: 'shuliang-xingcheng', moduleId: 'shuliang', name: '行程问题', description: '相遇追及、多次相遇、环形跑道' },
  { id: 'shuliang-liushui', moduleId: 'shuliang', name: '流水行船', description: '顺流逆流、船速水速' },
  { id: 'shuliang-lirun', moduleId: 'shuliang', name: '利润折扣', description: '成本定价、打折促销、利润率' },
  { id: 'shuliang-nongdu', moduleId: 'shuliang', name: '浓度问题', description: '溶质溶液、加水加溶质' },
  { id: 'shuliang-rongye', moduleId: 'shuliang', name: '溶液混合', description: '十字交叉、多次混合' },
  { id: 'shuliang-nianling', moduleId: 'shuliang', name: '年龄问题', description: '年龄差不变、倍数关系' },
  { id: 'shuliang-niucao', moduleId: 'shuliang', name: '牛吃草', description: '动态增耗、公式推导' },
  { id: 'shuliang-zhongbiao', moduleId: 'shuliang', name: '钟表日历', description: '指针夹角、日期星期、闰年' },
  { id: 'shuliang-pailie', moduleId: 'shuliang', name: '排列组合', description: '计数原理、分步分类、捆绑插空' },
  { id: 'shuliang-gailv', moduleId: 'shuliang', name: '概率问题', description: '古典概型、独立事件、条件概率' },
  { id: 'shuliang-rongchi', moduleId: 'shuliang', name: '容斥原理', description: '两集合、三集合容斥' },
  { id: 'shuliang-jihe', moduleId: 'shuliang', name: '几何问题', description: '平面几何、立体几何、相似全等' },
  { id: 'shuliang-zhengchu', moduleId: 'shuliang', name: '整除余数', description: '整除特性、同余、周期余数' },
  { id: 'shuliang-buding', moduleId: 'shuliang', name: '不定方程', description: '整数解、正整数解、特值法' },
  { id: 'shuliang-zuizhi', moduleId: 'shuliang', name: '最值极值', description: '最不利原则、构造最值' },
  { id: 'shuliang-tongchou', moduleId: 'shuliang', name: '统筹优化', description: '方案优化、费用最少、时间最短' },
  { id: 'shuliang-chouti', moduleId: 'shuliang', name: '抽屉原理', description: '最不利情况、保证型问题' },
  { id: 'shuliang-bili', moduleId: 'shuliang', name: '比例问题', description: '正反比例、比例分配、连比' },
  { id: 'shuliang-fangzhen', moduleId: 'shuliang', name: '方阵植树', description: '方阵人数、植树问题、封闭开放' },
  { id: 'shuliang-shulie', moduleId: 'shuliang', name: '数列推理', description: '等差等比、递推规律、多级数列' },
  { id: 'shuliang-shuzi', moduleId: 'shuliang', name: '数字推理', description: '分数数列、幂次数列、图形数字' },

  // ── 判断推理 ──
  { id: 'panduan-tuxing-shuliang', moduleId: 'panduan', name: '图形推理-数量', description: '点线角面素、笔画数' },
  { id: 'panduan-tuxing-weizhi', moduleId: 'panduan', name: '图形推理-位置', description: '平移旋转翻转、动态位置' },
  { id: 'panduan-tuxing-yangshi', moduleId: 'panduan', name: '图形推理-样式', description: '叠加遍历、对称曲直、开闭' },
  { id: 'panduan-tuxing-kongjian', moduleId: 'panduan', name: '图形推理-空间', description: '六面体折叠、相对面、公共边' },
  { id: 'panduan-tuxing-pinjie', moduleId: 'panduan', name: '图形推理-拼接', description: '立体拼接、小立方体计数' },
  { id: 'panduan-tuxing-gongneng', moduleId: 'panduan', name: '图形推理-功能', description: '功能元素、标记点线角' },
  { id: 'panduan-tuxing-heibai', moduleId: 'panduan', name: '图形推理-黑白块', description: '黑白块平移、对称、叠加' },
  { id: 'panduan-tuxing-jiemian', moduleId: 'panduan', name: '图形推理-截面', description: '立体截面、三视图' },
  { id: 'panduan-dingyi', moduleId: 'panduan', name: '定义判断', description: '关键词提取、属种关系、单定义多定义' },
  { id: 'panduan-leibi', moduleId: 'panduan', name: '类比推理', description: '词项关系、二级辨析、语法关系' },
  { id: 'panduan-fanyi', moduleId: 'panduan', name: '翻译推理', description: '假言联言选言命题、逆否等价' },
  { id: 'panduan-zhenjia', moduleId: 'panduan', name: '真假推理', description: '矛盾关系、反对关系、假设法' },
  { id: 'panduan-jiaqiang', moduleId: 'panduan', name: '加强削弱', description: '论证分析、搭桥拆桥、力度比较' },
  { id: 'panduan-guiyin', moduleId: 'panduan', name: '归因论证', description: '因果联系、因果倒置、另有他因、共变论证' },
  { id: 'panduan-luojilunzheng', moduleId: 'panduan', name: '逻辑论证', description: '论点论据、论证链条、论证有效性' },
  { id: 'panduan-lunzheng-fangshi', moduleId: 'panduan', name: '论证方式', description: '类比、因果、举例、对比等论证方法识别' },
  { id: 'panduan-xiangsi-jiegou', moduleId: 'panduan', name: '相似结构', description: '推理结构相同、论证形式匹配' },
  { id: 'panduan-lunzheng-quexian', moduleId: 'panduan', name: '论证缺陷', description: '逻辑漏洞、以偏概全、偷换概念、诉诸权威' },
  { id: 'panduan-qianti', moduleId: 'panduan', name: '前提假设', description: '必要前提、否定代入法' },
  { id: 'panduan-jieshi', moduleId: 'panduan', name: '解释评价', description: '解释矛盾、评价论证' },
  { id: 'panduan-fenxi', moduleId: 'panduan', name: '分析推理', description: '匹配排序、代入排除、最大信息' },
  { id: 'panduan-richang', moduleId: 'panduan', name: '日常结论', description: '从弱原则、话题一致、无中生有' },
  { id: 'panduan-guina', moduleId: 'panduan', name: '归纳推理', description: '归纳总结、规律推导' },

  // ── 资料分析 ──
  { id: 'ziliao-jiqi', moduleId: 'ziliao', name: '基期与现期', description: '基期量、现期量求解' },
  { id: 'ziliao-zengzhanglv', moduleId: 'ziliao', name: '增长率', description: '同比环比、一般增长率' },
  { id: 'ziliao-zengzhangliang', moduleId: 'ziliao', name: '增长量', description: '增长量计算与比较' },
  { id: 'ziliao-jiange', moduleId: 'ziliao', name: '间隔增长率', description: '隔年增长率公式' },
  { id: 'ziliao-hunhe', moduleId: 'ziliao', name: '混合增长率', description: '十字交叉、线段法' },
  { id: 'ziliao-nianjun', moduleId: 'ziliao', name: '年均增长率', description: '年均增速、年均增量' },
  { id: 'ziliao-bizhong', moduleId: 'ziliao', name: '比重', description: '现期比重、基期比重、两期比重' },
  { id: 'ziliao-pingjun', moduleId: 'ziliao', name: '平均数', description: '平均数增长率、两期平均' },
  { id: 'ziliao-beishu', moduleId: 'ziliao', name: '倍数', description: '倍数计算、翻番、多几倍' },
  { id: 'ziliao-gongxian', moduleId: 'ziliao', name: '贡献率', description: '增长贡献率、拉动增长' },
  { id: 'ziliao-maoyi', moduleId: 'ziliao', name: '贸易差额', description: '进出口、顺差逆差' },
  { id: 'ziliao-zonghe', moduleId: 'ziliao', name: '综合分析', description: '多材料综合判断' },
  { id: 'ziliao-duqu', moduleId: 'ziliao', name: '直接读数', description: '查找比较、排序计数' },
  { id: 'ziliao-jiandan', moduleId: 'ziliao', name: '简单计算', description: '加减乘除、差值比值' },
  { id: 'ziliao-susuan-shouwei', moduleId: 'ziliao', name: '首数/尾数法', description: '看首位或末位快速估算' },
  { id: 'ziliao-susuan-baifen', moduleId: 'ziliao', name: '百分数转化', description: '分数与百分数互换速算' },
  { id: 'ziliao-susuan-fangsu', moduleId: 'ziliao', name: '放缩估算', description: '放大缩小凑整速算' },
  { id: 'ziliao-susuan-bijiao', moduleId: 'ziliao', name: '速算比大小', description: '直除/交叉相乘比较' },
  { id: 'ziliao-susuan-cha', moduleId: 'ziliao', name: '差分/错位', description: '差分法、错位加减' },

  // ── 常识判断 ──
  { id: 'changshi-shizheng', moduleId: 'changshi', name: '时政热点', description: '国内国际时事、重大会议政策' },
  { id: 'changshi-dangshi', moduleId: 'changshi', name: '党史理论', description: '党的历史、重要理论、路线方针' },
  { id: 'changshi-xuanfa', moduleId: 'changshi', name: '宪法', description: '国家机构、公民权利、宪法修正' },
  { id: 'changshi-xingzheng', moduleId: 'changshi', name: '行政法', description: '行政行为、行政复议、行政诉讼' },
  { id: 'changshi-minfa', moduleId: 'changshi', name: '民法', description: '民事主体、合同、物权、侵权' },
  { id: 'changshi-xingfa', moduleId: 'changshi', name: '刑法', description: '犯罪构成、刑罚、常见罪名' },
  { id: 'changshi-qita-falv', moduleId: 'changshi', name: '其他法律', description: '劳动法、消费者权益、知识产权' },
  { id: 'changshi-hongguan', moduleId: 'changshi', name: '宏观经济', description: 'GDP、财政货币、通胀失业' },
  { id: 'changshi-weiguan', moduleId: 'changshi', name: '微观经济', description: '供需、市场结构、价格机制' },
  { id: 'changshi-gudai', moduleId: 'changshi', name: '中国古代史', description: '朝代更替、制度文化、重大事件' },
  { id: 'changshi-jindai', moduleId: 'changshi', name: '中国近现代史', description: '近代抗争、革命建设、改革开放' },
  { id: 'changshi-shijie', moduleId: 'changshi', name: '世界历史', description: '世界古代近代史、重大事件' },
  { id: 'changshi-wenxue', moduleId: 'changshi', name: '文学常识', description: '作家作品、诗词名句、文学流派' },
  { id: 'changshi-yishu', moduleId: 'changshi', name: '艺术体育', description: '书画音乐、戏曲影视、体育常识' },
  { id: 'changshi-chuantong', moduleId: 'changshi', name: '传统文化', description: '节日民俗、礼仪称谓、古代科技' },
  { id: 'changshi-qianyan', moduleId: 'changshi', name: '前沿科技', description: '航天信息、新能源、人工智能' },
  { id: 'changshi-shenghuo', moduleId: 'changshi', name: '生活科技', description: '物理化学生物、日常科学原理' },
  { id: 'changshi-yixue', moduleId: 'changshi', name: '生物医学', description: '人体生理、疾病防治、营养健康' },
  { id: 'changshi-ziran', moduleId: 'changshi', name: '自然地理', description: '气候地形、资源环境、灾害' },
  { id: 'changshi-zhongguo-dili', moduleId: 'changshi', name: '中国地理', description: '省区分布、河流山脉、区域特征' },
  { id: 'changshi-shijie-dili', moduleId: 'changshi', name: '世界地理', description: '大洲大洋、国家首都、世界名胜' },

  // ── 申论 ──
  { id: 'shenlun-guina', moduleId: 'shenlun', name: '归纳概括', description: '提炼要点、分类整合、规范表述' },
  { id: 'shenlun-wenti', moduleId: 'shenlun', name: '概括问题', description: '问题表现、负面现象归纳' },
  { id: 'shenlun-yuanyin', moduleId: 'shenlun', name: '概括原因', description: '原因分析、多角度归因' },
  { id: 'shenlun-yingxiang', moduleId: 'shenlun', name: '概括影响/意义', description: '积极影响、消极后果、意义价值' },
  { id: 'shenlun-jingyan', moduleId: 'shenlun', name: '概括经验/做法', description: '成功经验、创新举措提炼' },
  { id: 'shenlun-ciju', moduleId: 'shenlun', name: '词句理解', description: '词语理解、句子理解、深层含义' },
  { id: 'shenlun-guandian', moduleId: 'shenlun', name: '观点现象分析', description: '评价观点、分析现象、辩证思考' },
  { id: 'shenlun-duibi', moduleId: 'shenlun', name: '比较分析', description: '对比异同、优劣比较' },
  { id: 'shenlun-zonghe', moduleId: 'shenlun', name: '综合分析', description: '多要素分析、逻辑层次' },
  { id: 'shenlun-duice', moduleId: 'shenlun', name: '提出对策', description: '问题对策、可行性、针对性' },
  { id: 'shenlun-guanli-tongzhi', moduleId: 'shenlun', name: '贯彻执行-通知', description: '通知、通告、公告格式' },
  { id: 'shenlun-guanli-xuanchuan', moduleId: 'shenlun', name: '贯彻执行-宣传稿', description: '倡议书、宣传稿、公开信' },
  { id: 'shenlun-guanli-baogao', moduleId: 'shenlun', name: '贯彻执行-报告', description: '调研报告、汇报材料、简报' },
  { id: 'shenlun-guanli-jianghua', moduleId: 'shenlun', name: '贯彻执行-讲话稿', description: '发言稿、讲话稿、致辞' },
  { id: 'shenlun-guanli-qita', moduleId: 'shenlun', name: '贯彻执行-其他', description: '建议书、提纲、编者按' },
  { id: 'shenlun-lunshu', moduleId: 'shenlun', name: '申发论述', description: '大作文、论点论据、结构布局' },
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

export const DOUYIN_TAGS = ['考公', '公务员考试', '行测', '公考刷题', '判断推理', '公务员']
