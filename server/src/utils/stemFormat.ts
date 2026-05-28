/** 将 AI 返回的单行 pipe 表格规范化为换行分隔的多行表格 */
export function normalizeStemTables(stem: string): string {
  if (!stem.includes('|')) return stem

  const tableStart = stem.search(/\|\s*[^\|]+\s*\|\s*[^\|]+\s*\|/)
  if (tableStart === -1) return stem

  const intro = stem.slice(0, tableStart).trimEnd()
  let rest = stem.slice(tableStart)

  const questionMatch = rest.match(/(问[：:].+)$/)
  const question = questionMatch?.[1] ?? ''
  if (question) rest = rest.slice(0, rest.length - question.length).trimEnd()

  if (!/\s*\|\s*\|\s*/.test(rest)) {
    return stem
  }

  const rows = rest
    .split(/\s*\|\s*\|\s*/)
    .map((row) => rowToCells(row))
    .filter((cells) => cells.length >= 2)

  if (rows.length < 2) return stem

  const tableText = rows.map((cells) => `| ${cells.join(' | ')} |`).join('\n')
  const parts = [intro, tableText, question].filter(Boolean)
  return parts.join('\n')
}

function rowToCells(row: string): string[] {
  const trimmed = row.trim()
  const inner = trimmed.startsWith('|') ? trimmed.slice(1) : trimmed
  const withoutTrailing = inner.endsWith('|') ? inner.slice(0, -1) : inner
  return withoutTrailing
    .split('|')
    .map((c) => c.trim())
    .filter((c) => c.length > 0)
}
