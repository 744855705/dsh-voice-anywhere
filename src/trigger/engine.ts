/**
 * The trigger engine: the one place that subscribes to keyboard and mouse
 * events, and hands a match to the shared activation.
 */
import { matchesKey, matchesMouse, type Trigger } from './expression.ts'

/** What the engine needs from its owner. */
export interface TriggerHost {
  /** Triggers in force right now; re-read on every event so edits apply live. */
  readonly triggers: () => readonly Trigger[]
  /** Run the activation for one matched event. */
  readonly fire: () => void
}

/**
 * Listen for the configured triggers.
 * @param host - trigger source and the action to run.
 * @returns the removal function.
 */
export function startTriggers(host: TriggerHost): () => void {
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.repeat || event.isComposing) return
    // AltGr reports ctrl+alt on Windows; it types a character, it is not a shortcut.
    if (event.getModifierState?.('AltGraph') === true) return
    for (const trigger of host.triggers()) {
      if (!matchesKey(trigger, event)) continue
      event.preventDefault()
      event.stopPropagation()
      host.fire()
      return
    }
  }
  const onMouseDown = (event: MouseEvent): void => {
    for (const trigger of host.triggers()) {
      if (!matchesMouse(trigger, event)) continue
      event.preventDefault()
      event.stopPropagation()
      host.fire()
      return
    }
  }
  // Back/forward are acted on at auxclick, so the default has to be cancelled
  // there too or the browser navigates while the capture starts.
  const onAuxClick = (event: MouseEvent): void => {
    for (const trigger of host.triggers()) {
      if (!matchesMouse(trigger, event)) continue
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

