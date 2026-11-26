/**
 * Submit, exactly as pressing Enter would.
 *
 * The trigger exists so a remote or a mouse can finish what dictation started;
 * it therefore reproduces the key rather than guessing which button the user
 * meant. A synthetic Enter reaches the same handlers a real one does, including
 * React's delegated listeners.
 */
import { composerControl, floatingControl } from './controls.ts'
import { note } from './diagnostics.ts'
import { SELECTORS } from './selectors.ts'
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

  // The composer is excluded from dictation targets, but Enter belongs to it:
  // its own key handler is what sends the message.
  const active = document.activeElement
  if (active instanceof Element && active.closest(SELECTORS.composer) !== null) {
    const input = composerEditable(active.closest(SELECTORS.composer))
    if (input !== null) return input
  }

  const surface = findSurface()
  if (surface !== null) return surface.field

  // Nothing focused and no dockable surface: the composer is still the default
  // seat, unless a settings overlay owns the screen.
  if (document.querySelector(SELECTORS.settings) !== null || document.querySelector(SELECTORS.platform) !== null) return null
  return composerEditable(document.querySelector(SELECTORS.composer))
}

/**
 * Find the node the composer's key handler listens on.
 *
 * Lexical attaches its root listener to the contenteditable it creates, which
 * can sit inside the marked wrapper; dispatching on the wrapper would never
 * reach it, because the event only bubbles upwards.
 * @param card - the composer card, or null when it is not rendered.
 * @returns the editable root, or null.
 */
function composerEditable(card: Element | null): HTMLElement | null {
  if (card === null) return null
  const editable = card.querySelector('[contenteditable="true"], [contenteditable=""]')
  if (editable instanceof HTMLElement) return editable
  const marked = card.querySelector(SELECTORS.composerInput)
  return marked instanceof HTMLElement ? marked : null
}

/**
 * Send one Enter key sequence to an element.
 * @param element - the editable that receives it.
 */
export function dispatchEnter(element: HTMLElement): void {
  for (const type of ['keydown', 'keyup'] as const) {
    const event = new KeyboardEvent(type, ENTER)
    // Legacy handlers still read these; the constructor ignores them.
    Object.defineProperty(event, 'keyCode', { get: () => 13 })
    Object.defineProperty(event, 'which', { get: () => 13 })
    element.dispatchEvent(event)
  }
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
  note({
    submit: {
      target: target === null ? null : target.tagName + (target.closest(SELECTORS.composer) === null ? ':field' : ':composer'),
      recording: composerControl.state() === 'recording' || floatingControl.state() === 'recording',
    },
  })
  return target === null ? null : () => dispatchEnter(target)
}
