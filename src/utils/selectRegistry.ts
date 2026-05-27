let idCounter = 0

export function createSelectId(): number {
  return ++idCounter
}

export const FORM_SELECT_OPEN = 'kaogong:form-select-open'

export function notifySelectOpen(id: number): void {
  document.dispatchEvent(new CustomEvent(FORM_SELECT_OPEN, { detail: { id } }))
}
