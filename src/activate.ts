/**
 * The one activation both triggers share.
 *
 * A key, a mouse button and the official shortcut must agree on what "toggle
 * the microphone" means, so all three plan the same action here: stop whatever
 * is capturing, otherwise press whichever control the current focus owns.
 */
import { composerControl, floatingControl } from './controls.ts'
import { note } from './diagnostics.ts'
import { SELECTORS } from './selectors.ts'
import { findSurface } from './surfaces.ts'
import { classify } from './targets.ts'

/** The composer card owns its own microphone; ancestry decides which one to press. */

/** Frames to wait for the floating control to mount after we move focus. */
const FOCUS_ATTEMPTS = 8

/**
 * Dictate into a field that does not have focus yet: move focus there, wait for
 * the floating control to mount, then press it exactly as a click would.
 * @param element - editable inside a visible host.
 */
function focusAndPress(element: HTMLElement): void {
  element.focus({ preventScroll: true })
  let attempts = 0
  const step = (): void => {
    if (floatingControl.press()) return
    if (attempts < FOCUS_ATTEMPTS) {
      attempts += 1
      requestAnimationFrame(step)
    }
  }
  requestAnimationFrame(step)
}

/**
 * Plan the activation for this keypress or click.
 * @param target - the event target, when a shortcut supplies one.
 * @returns the action to run, or null when nothing should happen.
 */
export function planActivation(target?: Element | null): (() => void) | null {
  const focused = target ?? document.activeElement
  const inComposer = focused instanceof Element && focused.closest(SELECTORS.composer) !== null
  const composerState = composerControl.state()
  const floatingState = floatingControl.state()
  const states = {
    focused: focused instanceof Element ? focused.tagName : String(focused),
    inComposer,
    composerState,
    floatingState,
    field: classify(focused) !== null,
  }

  // A running capture is stopped no matter where the caret went: otherwise
  // moving focus mid-recording would leave the key unable to stop it.
  if (composerState === 'recording') { note({ ...states, branch: 'composer-recording' }); return () => { composerControl.press() } }
  if (floatingState === 'recording') { note({ ...states, branch: 'floating-recording' }); return () => { floatingControl.press() } }
  if (inComposer && composerState === 'idle') { note({ ...states, branch: 'composer-idle' }); return () => { composerControl.press() } }
  if (!inComposer && floatingState === 'idle') { note({ ...states, branch: 'floating-idle' }); return () => { floatingControl.press() } }

  // Focus sits on a button while a visible host offers a field: dictate there,
  // through the same policy the button itself applies.
  if (floatingState === 'none') {
    // A focused field the policy denies must keep the trigger inert.
    if (classify(focused) !== null) { note({ ...states, branch: 'denied-field' }); return null }
    const surface = findSurface()
    if (surface !== null) { note({ ...states, branch: `surface:${surface.kind}` }); return () => focusAndPress(surface.field) }
    note({ ...states, branch: 'no-surface' })
  }

  // No field either: the composer is the default target and its microphone is
  // always mounted. Requiring `none` keeps a floating capture that is still
  // transcribing from being shadowed by a composer capture.
  // A surface that hides the microphone (settings, platform) must not silently
  // start the composer one instead.
  if (focused instanceof Element
    && (focused.closest(SELECTORS.settings) !== null || focused.closest(SELECTORS.platform) !== null)) {
    note({ ...states, branch: 'settings-context' })
    return null
  }
  if (floatingState === 'none' && composerState === 'idle') { note({ ...states, branch: 'composer-fallback' }); return () => { composerControl.press() } }
  note({ ...states, branch: 'nothing' })
  return null
}
