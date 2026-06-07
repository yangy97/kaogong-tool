import { isTuxingTopicId } from '../types/tuxing'

/** 图形推理 AI 输出规范 */
export function buildTuxingAiPromptBlock(topicId?: string, batchCount = 1): string {
  const lines = [
    '图形题：options.text 留空；tuxing.sequence 为 3 个图形+null；tuxing.options 为 A-D 四个图形。',
    'kind=grid：filled 为涂黑格坐标 [行,列]（0 起算），每个图形至少 1 个涂黑格；analysis 数量必须等于 filled.length。',
    'A/B/C/D 四个选项的 filled 必须互不相同（禁止复制同一组坐标），干扰项涂黑格数应与正确答案不同。',
    'kind=shapes：items 为 circle/rect/triangle 且每项非空，四个选项图形必须可区分。',
    '禁止用文字描述代替 tuxing JSON。',
  ]

  if (topicId?.includes('pinjie') || topicId?.includes('shuliang')) {
    lines.push(
      '数量/拼接类：使用 kind=grid，涂黑格表示可见立方体个数，序列 filled.length 应呈清晰递增（如 5、6、7、8），再据此写 analysis。',
    )
  }
  if (topicId?.includes('heibai')) {
    lines.push(
      '黑白块：使用 kind=grid，filled 表示黑块位置，规律体现在黑块平移、对称或数量递增。',
      '勿总用「逐格+1」同一模板；可交替使用平移、镜像、对角分布等不同规律。',
    )
  }
  if (batchCount > 1) {
    lines.push(
      `本批共 ${batchCount} 道图形题：每题 tuxing 须互不相同，禁止复制其他题的 filled 坐标或相同规律链。`,
    )
  }
  if (topicId?.includes('kongjian')) {
    lines.push(
      '空间折叠类：题干用 kind=net（六面体展开图，faces 含 id/row/col/mark）；选项用 kind=cube（折后立方体三面标记 top/left/right）。',
      'analysis 须写相对面/公共边/面1-面6，禁止写截面/剖面。',
      '示例题干：{"kind":"net","faces":[{"id":1,"row":0,"col":1,"mark":"arrow-up"},...],"highlight":[2,4]}；选项：{"kind":"cube","top":"arrow-up","left":"arrow-right","right":"dot"}。',
    )
  }
  if (topicId?.includes('jiemian')) {
    lines.push(
      '截面类：题干 sequence 最后一项 null；选项用 kind=polygon（三/四/五/六边形各不相同）。',
      '立方体堆叠用 kind=voxel；圆柱/圆锥用 kind=solid（preset: cylinderCone|cylinder|cone）。',
      'analysis 须写截面形状，禁止写相对面/折叠。',
    )
  }

  return lines.join('')
}

export function buildTuxingPromptIfNeeded(topicId?: string, batchCount = 1): string {
  return isTuxingTopicId(topicId) ? buildTuxingAiPromptBlock(topicId, batchCount) : ''
}
