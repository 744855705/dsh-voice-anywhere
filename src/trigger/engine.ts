/**
 * The trigger engine: the one place that subscribes to keyboard and mouse
 * events, and hands a match to the shared activation.
 */
import { note } from '../diagnostics.ts'
import { matchesKey, matchesMouse, type Trigger } from './expression.ts'

/** One set of triggers and the action a match runs. */
export interface TriggerBinding {
  /** Triggers in force right now; re-read on every event so edits apply live. */
  readonly triggers: () => readonly Trigger[]
  /** Run the action for one matched event. */
  readonly fire: () => void
}

/**
 * Listen for every configured binding.
 *
 * One listener pair serves all bindings: two independent engines would race on
 * the same event and could fire twice.
 * @param bindings - groups in priority order; the first match wins.
 * @returns the removal function.
 */
export function startTriggers(bindings: readonly TriggerBinding[]): () => void {
  /**
   * Record a side-button event.
   *
   * Browsers deliver these as `mousedown` with button 3/4, but a desktop shell
   * may consume them first; without a trace there is no way to tell "nothing
   * arrived" from "it arrived and did not match".
   * @param type - the event type that was seen.
   * @param event - the mouse event.
   */
  const observeSideButton = (type: string, event: MouseEvent): void => {
    if (event.button !== 3 && event.button !== 4) return
    note({ sideButton: { type, button: event.button } })
  }

  /**
   * Dispatch one event to the first matching binding.
   * @param event - the captured event.
   * @param matches - matcher for this event kind.
   * @returns whether something matched.
   */
  const dispatch = (event: Event, matches: (trigger: Trigger) => boolean): boolean => {
    for (const binding of bindings) {
      for (const trigger of binding.triggers()) {
        if (!matches(trigger)) continue
        event.preventDefault()
        event.stopPropagation()
        binding.fire()
        return true
      }
    }
    return false
  }
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.isComposing) return
    // AltGr reports ctrl+alt on Windows; it types a character, it is not a shortcut.
    if (event.getModifierState?.('AltGraph') === true) return
    dispatch(event as Event, trigger => matchesKey(trigger, event))
  }
  const onMouseDown = (event: MouseEvent): void => {
    observeSideButton('mousedown', event)
    dispatch(event as Event, trigger => matchesMouse(trigger, event))
  }
  // Back/forward are acted on at auxclick, so the default has to be cancelled
  // there too or the browser navigates while the action starts.
  const onAuxClick = (event: MouseEvent): void => {
    observeSideButton('auxclick', event)
    for (const binding of bindings) {
      if (!binding.triggers().some(trigger => matchesMouse(trigger, event))) continue
      event.preventDefault()
      event.stopPropagation()
      return
    }
  }
  window.addEventListener('keydown', onKeyDown, true)
  window.addEventListener('mousedown', onMouseDown, true)
  window.addEventListener('auxclick', onAuxClick, true)
  return () => {
    window.removeEventListener('keydown', onKeyDown, true)
    window.removeEventListener('mousedown', onMouseDown, true)
    window.removeEventListener('auxclick', onAuxClick, true)
  }
}
