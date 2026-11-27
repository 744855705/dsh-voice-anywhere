/**
 * Where a transcript lands, and what to do when the original target is gone.
 *
 * The rule is append, never lose: the captured element first, then whatever can
 * take text right now, and only when nothing can does the caller report failure
 * so the official component keeps the transcript pending instead of dropping it.
 */
import { findSurface } from './surfaces.ts'
import { classify, insertText, type EditableKind, type EditableTarget } from './targets.ts'

/** The element captured when the recording started. */
export interface InsertionSpan {
  readonly element: HTMLElement
  readonly kind: EditableKind
}

/**
 * Resolve a target that exists right now.
 * @returns the focused editable, else the visible surface's field, else null.
 */
export function liveTarget(): EditableTarget | null {
  const focused = classify(document.activeElement)
  if (focused !== null) return focused
  const surface = findSurface()
  return surface === null ? null : { element: surface.field, kind: surface.fieldKind }
}

/**
 * Append a transcript, falling back to a live target.
 * @param text - transcript.
 * @param span - element captured at recording start, or null when it had none.
 * @returns whether the text was written somewhere.
 */
export function insertTranscript(text: string, span: InsertionSpan | null): boolean {
  if (span !== null && span.element.isConnected && insertText({ element: span.element, kind: span.kind }, text)) {
    return true
  }
  const target = liveTarget()
  return target !== null && insertText(target, text)
}
