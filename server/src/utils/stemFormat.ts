/** 将 AI 返回的单行 pipe 表格规范化为换行分隔的多行表格 */

const QUESTION_TAIL_PATTERNS = [
  /(问[：:].+)$/s,
  /((?:若|当|已知|根据(?:以上|下列|材料)).{8,}[？?]?)$/s,
  /(则.{8,}[？?：:])$/s,
]

function extractTrailingQuestion(text: string): string {
  for (const re of QUESTION_TAIL_PATTERNS) {
    const m = text.match(re)
    if (m?.[1]) return m[1].trim()
  }
  return ''
}

function isQuestionLike(text: string): boolean {
  const t = text.trim()
  if (t.length < 10) return false
  return (
    /^问[：:]/.test(t) ||
    /^若/.test(t) ||
    /^当/.test(t) ||
    /^已知/.test(t) ||
    /^根据/.test(t) ||
    /[？?]$/.test(t) ||
    (/(?:则|占|比重|约为|多少|几)/.test(t) && t.length >= 15)
  )
}

function splitCellValueAndQuestion(cell: string): { value: string; question: string } {
  const trimmed = cell.trim()
  const merged = trimmed.match(/^([\d.]+%?)\s+((?:若|当|问[：:]|已知|根据).+)$/)
  if (merged) return { value: merged[1]!, question: merged[2]! }
  if (isQuestionLike(trimmed)) return { value: '', question: trimmed }
  return { value: trimmed, question: '' }
}

function fixTableRows(rows: string[][]): { rows: string[][]; trailingText: string } {
  if (!rows.length) return { rows, trailingText: '' }

  const headerCols = rows[0]!.length
  const trailing: string[] = []
  const fixed = rows.map((row) => [...row])

  for (let ri = 1; ri < fixed.length; ri++) {
    const row = fixed[ri]!
    if (row.length > headerCols) {
      trailing.push(...row.slice(headerCols).map((c) => c.trim()).filter(Boolean))
      row.splice(headerCols)
    }
    if (row.length > 0) {
      const lastIdx = row.length - 1
      const { value, question } = splitCellValueAndQuestion(row[lastIdx]!)
      if (question) {
        row[lastIdx] = value
        trailing.push(question)
      }
    }
  }

  return { rows: fixed, trailingText: trailing.filter(Boolean).join('\n') }
}

export function normalizeStemTables(stem: string): string {
  if (!stem.includes('|')) return stem

  const tableStart = stem.search(/\|\s*[^\|]+\s*\|\s*[^\|]+\s*\|/)
  if (tableStart === -1) return stem

  const intro = stem.slice(0, tableStart).trimEnd()
  let rest = stem.slice(tableStart)

  const question = extractTrailingQuestion(rest)
  if (question) rest = rest.slice(0, rest.length - question.length).trimEnd()

  if (!/\s*\|\s*\|\s*/.test(rest)) {
    if (rest.includes('\n') && /^\s*\|/m.test(rest)) {
      const lines = rest.split('\n')
      const tableLines = lines.filter((l) => l.trim().startsWith('|'))
      if (tableLines.length >= 2) {
        const rows = tableLines
          .filter((l) => !/^\|[\s\-:|]+\|$/.test(l.trim()))
          .map((l) => rowToCells(l))
          .filter((cells) => cells.length >= 2)
        if (rows.length >= 2) {
          const { rows: fixedRows, trailingText } = fixTableRows(rows)
          const tableText = fixedRows.map((cells) => `| ${cells.join(' | ')} |`).join('\n')
          const lastTableLine = tableLines[tableLines.length - 1]!
          const lastIdx = lines.findIndex((l) => l === lastTableLine)
          const afterTable = lines.slice(lastIdx + 1).join('\n').trim()
          const tail = [question, trailingText, afterTable].filter(Boolean).join('\n')
          return [intro, tableText, tail].filter(Boolean).join('\n')
        }
      }
    }
    return stem
  }

  const rows = rest
    .split(/\s*\|\s*\|\s*/)
    .map((row) => rowToCells(row))
    .filter((cells) => cells.length >= 2)

  if (rows.length < 2) return stem

  const { rows: fixedRows, trailingText } = fixTableRows(rows)
  const tableText = fixedRows.map((cells) => `| ${cells.join(' | ')} |`).join('\n')
  const tail = [question, trailingText].filter(Boolean).join('\n')
  return [intro, tableText, tail].filter(Boolean).join('\n')
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
