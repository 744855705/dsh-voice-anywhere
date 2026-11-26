/**
 * Editable-target detection and the two text-insertion paths.
 *
 * Pure decisions live here so the browser wiring above stays about focus and
 * placement, and so the rules can be reasoned about without a mounted page.
 */

/** A field inserts through its value setter; an editor inserts through the selection. */
export type EditableKind = 'field' | 'editor'

export interface EditableTarget {
  readonly element: HTMLElement
  readonly kind: EditableKind
}

/** Input types that hold free text; numbers, dates, files and passwords are excluded on purpose. */
const TEXT_INPUTS: ReadonlySet<string> = new Set(['text', 'search', 'url', 'tel', 'email'])

/** The composer owns its own microphone, so nothing inside it is ours. */
const COMPOSER = '[data-composer-card]'

/**
 * Ignore controls that are present but unusable: hidden inputs, zero-size
 * terminal and editor textareas, and anything the composer owns.
 * @param element - candidate control.
 * @returns whether the control can receive dictated text.
 */
function usable(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  return rect.width >= 60 && rect.height >= 16 && element.getClientRects().length > 0
}

/**
 * Classify the element that just received focus.
 * @param node - focus target, possibly a descendant of an editor.
 * @returns the editable to dictate into, or null when this element is not ours.
 */
export function classify(node: EventTarget | null): EditableTarget | null {
  if (!(node instanceof HTMLElement)) return null
  if (node.closest(COMPOSER)) return null

  if (node instanceof HTMLInputElement) {
    if (!TEXT_INPUTS.has(node.type) || node.disabled || node.readOnly || !usable(node)) return null
    return { element: node, kind: 'field' }
  }
  if (node instanceof HTMLTextAreaElement) {
    if (node.disabled || node.readOnly || !usable(node)) return null
    return { element: node, kind: 'field' }
  }
  // Focus can land on a child span; the editor root owns the caret and survives re-renders.
  const editor = node.closest('[contenteditable="true"], [contenteditable=""]')
  if (editor instanceof HTMLElement && !editor.closest(COMPOSER) && usable(editor)) {
    return { element: editor, kind: 'editor' }
  }
  return null
}

/**
 * Write dictated text into a target at its caret.
 * @param target - editable captured when recording started.
 * @param text - transcript.
 * @returns whether the text landed in the target.
 */
export function insertText(target: EditableTarget, text: string): boolean {
  if (!target.element.isConnected) return false
  return target.kind === 'field'
    ? insertField(target.element as HTMLInputElement | HTMLTextAreaElement, text)
    : insertEditor(target.element, text)
}

/**
 * React controls read their value back from the DOM on the native `input`
 * event, so the prototype setter (which bypasses React's value tracker) plus
 * one bubbling event is the path that keeps the component's own state in sync.
 * @param element - input or textarea.
 * @param text - transcript.
 * @returns true after the event is dispatched.
 */
function insertField(element: HTMLInputElement | HTMLTextAreaElement, text: string): boolean {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
  if (setter === undefined) return false
  // Append instead of inserting at the caret: dialogs often open with their
  // field fully selected, so caret insertion would replace what was there.
  const current = element.value
  const separator = current.length > 0 && !/\s$/u.test(current) ? ' ' : ''
  const next = current + separator + text
  setter.call(element, next)
  element.focus({ preventScroll: true })
  const caret = next.length
  try {
    element.setSelectionRange(caret, caret)
  } catch {
    // Some input types reject selection writes; the value still landed.
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
  return true
}

/**
 * Rich editors (Lexical among them) commit a `beforeinput` insertion in a
 * microtask, so a synchronous "unchanged" reading proves nothing: insert once,
 * and only a still-unchanged editor after three macrotasks gets one plain DOM
 * insert, which must not dispatch `input` or the text lands twice.
 * @param element - contenteditable host.
 * @param text - transcript.
 * @returns true after the first insertion attempt.
 */
function insertEditor(element: HTMLElement, text: string): boolean {
  // Refocusing an already focused editor can reset the caret to the start.
  if (document.activeElement !== element) element.focus({ preventScroll: true })
  // Same append rule as fields: place the caret at the end before inserting.
  const selection = document.getSelection()
  if (selection !== null) {
    const range = document.createRange()
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
  const before = readEditor(element)
  let executed = false
  try {
    executed = document.execCommand('insertText', false, text)
  } catch {
    executed = false
  }
  if (!executed) {
    appendPlain(element, text)
    return true
  }
  setTimeout(() => setTimeout(() => setTimeout(() => {
    if (element.isConnected && readEditor(element) === before) appendPlain(element, text)
  }, 0), 0), 0)
  return true
}

/**
 * Read editor text without relying on layout.
 * @param element - contenteditable host.
 * @returns its current text.
 */
function readEditor(element: HTMLElement): string {
  return element.innerText ?? element.textContent ?? ''
}

/**
 * Insert at the caret without touching the editor's event pipeline.
 * @param element - contenteditable host.
 * @param text - transcript.
 */
function appendPlain(element: HTMLElement, text: string): void {
  const selection = document.getSelection()
  const range = document.createRange()
  const current = selection !== null && selection.rangeCount > 0 ? selection.getRangeAt(0) : null
  if (current !== null && element.contains(current.endContainer)) {
    range.setStart(current.endContainer, current.endOffset)
    range.collapse(true)
  } else {
    // No caret inside the editor: append rather than prepend, which is what a
    // `collapse(true)` on the whole contents would silently do.
    range.selectNodeContents(element)
    range.collapse(false)
  }
  range.insertNode(document.createTextNode(text))
  const caret = document.createRange()
  caret.selectNodeContents(element)
  caret.collapse(false)
  selection?.removeAllRanges()
  selection?.addRange(caret)
}
