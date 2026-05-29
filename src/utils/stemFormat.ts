export type StemSegment =
  | { type: 'text'; text: string }
  | { type: 'table'; rows: string[][] }

/** 将单行 pipe 表格规范化为多行 */
export function normalizeStemTables(stem: string): string {
  if (!stem.includes('|')) return stem

  const tableStart = stem.search(/\|\s*[^\|]+\s*\|\s*[^\|]+\s*\|/)
  if (tableStart === -1) return stem

  const intro = stem.slice(0, tableStart).trimEnd()
  let rest = stem.slice(tableStart)

  const question = extractTrailingQuestion(rest)
  if (question) rest = rest.slice(0, rest.length - question.length).trimEnd()

  if (!/\s*\|\s*\|\s*/.test(rest)) {
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

/** 解析 stem 为文本段 + 表格段 */
export function parseStem(stem: string): StemSegment[] {
  const normalized = normalizeStemTables(stem)
  const segments: StemSegment[] = []
  const lines = normalized.split('\n')
  let textBuffer: string[] = []
  let i = 0

  const flushText = () => {
    const text = textBuffer.join('\n').trim()
    if (text) segments.push({ type: 'text', text })
    textBuffer = []
  }

  while (i < lines.length) {
    const line = lines[i]!
    if (isTableLine(line)) {
      flushText()
      const tableRows: string[][] = []
      while (i < lines.length && isTableLine(lines[i]!)) {
        const row = lines[i]!
        if (!isSeparatorRow(row)) {
          tableRows.push(rowToCells(row))
        }
        i++
      }
      if (tableRows.length) {
        const { rows, trailingText } = fixTableRows(tableRows)
        segments.push({ type: 'table', rows })
        if (trailingText.trim()) textBuffer.push(trailingText.trim())
      }
    } else {
      textBuffer.push(line)
      i++
    }
  }

  flushText()
  return segments.length ? segments : [{ type: 'text', text: stem }]
}

/** 转为 HTML（用于配图渲染） */
export function stemToHtml(stem: string, options?: { dark?: boolean }): string {
  const dark = options?.dark ?? false
  const textColor = dark ? '#f0f0f0' : 'inherit'
  const thStyle = dark
    ? 'padding:8px 12px;border:1px solid rgba(255,255,255,0.25);background:rgba(0,242,234,0.18);color:#f0f0f0;font-weight:600;text-align:center;'
    : 'padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:600;text-align:center;'
  const tdStyle = dark
    ? 'padding:8px 12px;border:1px solid rgba(255,255,255,0.2);text-align:center;color:#f0f0f0;'
    : 'padding:8px 12px;border:1px solid #ddd;text-align:center;'

  const segments = parseStem(stem)
  return segments
    .map((seg) => {
      if (seg.type === 'text') {
        return `<p style="margin:0 0 12px;line-height:1.8;color:${textColor};">${escapeHtml(seg.text)}</p>`
      }
      const header = seg.rows[0]!
      const body = seg.rows.slice(1)
      const ths = header.map((c) => `<th style="${thStyle}">${escapeHtml(c)}</th>`).join('')
      const trs = body
        .map(
          (row) =>
            `<tr>${row.map((c) => `<td style="${tdStyle}">${escapeHtml(c)}</td>`).join('')}</tr>`,
        )
        .join('')
      return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:26px;color:${textColor};"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
    })
    .join('')
}

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

/** 修正列数不齐、设问误入末格/额外列 */
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

function isTableLine(line: string): boolean {
  const trimmed = line.trim()
  return trimmed.startsWith('|') && trimmed.lastIndexOf('|') > 0
}

function isSeparatorRow(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim())
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

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
