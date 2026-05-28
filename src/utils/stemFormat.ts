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

  const questionMatch = rest.match(/(问[：:].+)$/)
  const question = questionMatch?.[1] ?? ''
  if (question) rest = rest.slice(0, rest.length - question.length).trimEnd()

  if (!/\s*\|\s*\|\s*/.test(rest)) return stem

  const rows = rest
    .split(/\s*\|\s*\|\s*/)
    .map((row) => rowToCells(row))
    .filter((cells) => cells.length >= 2)

  if (rows.length < 2) return stem

  const tableText = rows.map((cells) => `| ${cells.join(' | ')} |`).join('\n')
  return [intro, tableText, question].filter(Boolean).join('\n')
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
      if (tableRows.length) segments.push({ type: 'table', rows: tableRows })
    } else {
      textBuffer.push(line)
      i++
    }
  }

  flushText()
  return segments.length ? segments : [{ type: 'text', text: stem }]
}

/** 转为 HTML（用于配图渲染） */
export function stemToHtml(stem: string): string {
  const segments = parseStem(stem)
  return segments
    .map((seg) => {
      if (seg.type === 'text') {
        return `<p style="margin:0 0 12px;line-height:1.8;">${escapeHtml(seg.text)}</p>`
      }
      const header = seg.rows[0]!
      const body = seg.rows.slice(1)
      const ths = header.map((c) => `<th style="padding:8px 12px;border:1px solid #ddd;background:#f5f5f5;font-weight:600;text-align:center;">${escapeHtml(c)}</th>`).join('')
      const trs = body
        .map(
          (row) =>
            `<tr>${row.map((c) => `<td style="padding:8px 12px;border:1px solid #ddd;text-align:center;">${escapeHtml(c)}</td>`).join('')}</tr>`,
        )
        .join('')
      return `<table style="width:100%;border-collapse:collapse;margin:12px 0;font-size:26px;"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
    })
    .join('')
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
