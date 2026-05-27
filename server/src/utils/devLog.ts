const isDev = process.env.NODE_ENV !== 'production'

export function isDevMode(): boolean {
  return isDev || process.env.DEBUG_API === 'true'
}

export function devLog(tag: string, ...args: unknown[]): void {
  if (isDevMode()) {
    console.log(`[${tag}]`, ...args)
  }
}

export function devGroup(tag: string, fn: () => void): void {
  if (!isDevMode()) return
  console.log(`\n── ${tag} ──`)
  fn()
  console.log(`── /${tag} ──\n`)
}

/** 截断长文本，便于日志阅读 */
export function preview(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, ' ').trim()
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`
}
