/**
 * Submit, exactly as pressing Enter would.
 *
 * The trigger exists so a remote or a mouse can finish what dictation started;
 * it therefore reproduces the key rather than guessing which button the user
 * meant. A synthetic Enter reaches the same handlers a real one does, including
 * React's delegated listeners.
 */
import { composerControl, floatingControl } from './controls.ts'
import { findSurface } from './surfaces.ts'
import { classify } from './targets.ts'

/** The key sequence a submit reproduces. */
const ENTER = { key: 'Enter', code: 'Enter', bubbles: true, cancelable: true, composed: true } as const

/**
 * Resolve the editable that should receive Enter.
 *
 * The focused field wins because that is where a real Enter would land; the
 * visible surface's field is the fallback for the case where focus wandered to
 * a button after dictation inserted its text.
 * @returns the editable, or null when there is nothing to submit into.
 */
export function submitTarget(): HTMLElement | null {
  const focused = classify(document.activeElement)
  if (focused !== null) return focused.element
  return findSurface()?.field ?? null
}

/**
 * Send one Enter key sequence to an element.
 * @param element - the editable that receives it.
 */
export function dispatchEnter(element: HTMLElement): void {
  element.dispatchEvent(new KeyboardEvent('keydown', ENTER))
  element.dispatchEvent(new KeyboardEvent('keyup', ENTER))
}

/**
 * Plan the submit action.
 * @returns the action to run, or null while a capture is in progress or when no
 * editable can take the key.
 */
export function planSubmit(): (() => void) | null {
  // A running capture owns the keyboard: submitting mid-recording would insert
  // half a transcript and then send it.
  if (composerControl.state() === 'recording' || floatingControl.state() === 'recording') return null
  const target = submitTarget()
  return target === null ? null : () => dispatchEnter(target)
}
