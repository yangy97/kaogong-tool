/**
 * 解析 AI 返回的 JSON 数组，容忍 markdown 包裹、轻微格式错误与截断。
 */

function stripCodeFences(text: string): string {
  let s = text.trim()
  const fence = /^```(?:json)?\s*\n?([\s\S]*?)\n?```\s*$/i.exec(s)
  if (fence) s = fence[1].trim()
  return s.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim()
}

/** 截取最外层 JSON 数组片段 */
function extractArraySlice(text: string): string {
  const start = text.indexOf('[')
  if (start < 0) return text
  let depth = 0
  let inString = false
  let escape = false
  let end = -1

  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (inString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '[') depth++
    else if (c === ']') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }

  if (end > start) return text.slice(start, end + 1)
  return text.slice(start)
}

/** 截断时尽量 salvage 已完整的对象 */
function salvageCompleteObjects(slice: string): unknown[] {
  const inner = slice.startsWith('[') ? slice.slice(1) : slice
  const objects: unknown[] = []
  let depth = 0
  let inString = false
  let escape = false
  let objStart = -1

  for (let i = 0; i < inner.length; i++) {
    const c = inner[i]
    if (inString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '{') {
      if (depth === 0) objStart = i
      depth++
    } else if (c === '}') {
      depth--
      if (depth === 0 && objStart >= 0) {
        const chunk = inner.slice(objStart, i + 1)
        try {
          objects.push(JSON.parse(chunk))
        } catch {
          /* 跳过损坏对象 */
        }
        objStart = -1
      }
    }
  }
  return objects
}

/** 修复未闭合的字符串与括号（应对 max_tokens 截断） */
function repairTruncatedJson(slice: string): string {
  let s = slice.trim()
  if (!s.startsWith('[')) s = `[${s}`

  let inString = false
  let escape = false
  let bracket = 0
  let brace = 0

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') inString = false
      continue
    }
    if (c === '"') {
      inString = true
      continue
    }
    if (c === '[') bracket++
    else if (c === ']') bracket--
    else if (c === '{') brace++
    else if (c === '}') brace--
  }

  if (inString) s += '"'
  while (brace > 0) {
    s += '}'
    brace--
  }
  while (bracket > 0) {
    s += ']'
    bracket--
  }
  return s
}

function tryParse(slice: string): unknown[] | null {
  try {
    const parsed = JSON.parse(slice)
    return Array.isArray(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function parseAiJsonArray(text: string, minItems = 1): unknown[] {
  const cleaned = stripCodeFences(text)
  const slice = extractArraySlice(cleaned)

  const attempts = [
    slice,
    repairTruncatedJson(slice),
    slice.replace(/,\s*([\]}])/g, '$1'),
  ]

  for (const candidate of attempts) {
    const result = tryParse(candidate)
    if (result && result.length >= minItems) return result
  }

  const salvaged = salvageCompleteObjects(slice)
  if (salvaged.length >= minItems) return salvaged

  const repaired = repairTruncatedJson(slice)
  const fromRepair = tryParse(repaired)
  if (fromRepair && fromRepair.length > 0) return fromRepair

  if (salvaged.length > 0) return salvaged

  let hint = 'AI 返回的 JSON 无法解析'
  try {
    JSON.parse(slice)
  } catch (e) {
    if (e instanceof SyntaxError) hint = e.message
  }
  throw new Error(`${hint}，请减少题量或重试`)
}
