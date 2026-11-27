/**
 * One press contract for both microphone entries.
 *
 * The shortcut must behave exactly like pressing the button under the current
 * target, so it never calls the recording pipeline itself: it resolves a
 * container and dispatches the click the user would have made. Keeping the DOM
 * selectors here means the composer's markup is known in one place only.
 */

/**
 * Idle microphone, active capture, a finished capture awaiting dismissal, or a state that
 * accepts no press.
 */
export type ControlState = 'none' | 'idle' | 'recording' | 'feedback' | 'busy'

export interface VoiceControl {
  /** @returns the container's phase, or `none` when it is not rendered. */
  state(): ControlState
  /** @returns whether a press right now would reach a button. */
  canPress(): boolean
  /** @returns whether a click was dispatched. */
  press(): boolean
}

/** The official microphone occupies this slot inside the composer card. */
const COMPOSER_CONTAINER = '[data-composer-card] [data-slot="conversation.input.activity"]'
/** Our floating instance marks its portal root. */
export const FLOATING_ROOT = '[data-voice-anywhere-root]'
/** Both instances render the capture row with this phase attribute. */
const ACTIVITY = '[data-voice-activity]'

/**
 * Read the phase of one microphone container.
 * @param container - slot anchor or portal root.
 * @returns the press-relevant state.
 */
function stateOf(container: HTMLElement | null): ControlState {
  if (container === null) return 'none'
  const row = container.querySelector(ACTIVITY)
  if (row === null) return container.querySelector('button') === null ? 'none' : 'idle'
  const phase = row.getAttribute('data-voice-activity')
  if (phase === 'recording') return 'recording'
  // A finished capture stays on screen until something dismisses it, and its only keyboard exit
  // is this press: without it the row keeps the composer unmounted and every shortcut dead.
  if (phase === 'feedback') return 'feedback'
  return 'busy'
}

/**
 * Detect a capture already running somewhere other than `container`.
 * @param container - the container a press would act on, or null when it does not exist yet.
 * @returns whether another entry holds the microphone.
 */
export function hasForeignRecording(container: Element | null): boolean {
  for (const row of document.querySelectorAll('[data-voice-activity="recording"]')) {
    if (container === null || !container.contains(row)) return true
  }
  return false
}

/**
 * Build a control over one container.
 * @param find - locates the current container.
 * @returns the press contract.
 */
function controlOver(find: () => HTMLElement | null): VoiceControl {
  const state = (): ControlState => stateOf(find())
  const canPress = (): boolean => {
    const container = find()
    const phase = stateOf(container)
    if (container === null || phase === 'none' || phase === 'busy') return false
    // Dismissing a finished capture never touches the microphone, so it is always allowed.
    if (phase === 'feedback') return true
    // A second capture must never start while another entry is recording.
    return phase === 'recording' || !hasForeignRecording(container)
  }
  return {
    state,
    canPress,
    press: () => {
      if (!canPress()) return false
      const container = find()
      if (container === null) return false
      const row = container.querySelector(ACTIVITY)
      const buttons = (row ?? container).querySelectorAll('button')
      if (buttons.length === 0) return false
      // The row leads with a bare cancel ✕ and ends with whatever the row is for:
      // stop while recording, insert a preserved transcript, or retry after an
      // empty result. That trailing button is the action a shortcut drives; the
      // ✕ stays a pointer-only affordance. Idle has a single trigger button.
      const phase = stateOf(container)
      const actionable = phase === 'recording' || phase === 'feedback'
      const button = actionable ? buttons[buttons.length - 1] : buttons[0]
      ;(button as HTMLButtonElement).click()
      return true
    },
  }
}

/** The microphone inside the conversation composer. */
export const composerControl: VoiceControl = controlOver(() => document.querySelector<HTMLElement>(COMPOSER_CONTAINER))

/** The microphone this plugin floats next to the focused field. */
export const floatingControl: VoiceControl = controlOver(() => document.querySelector<HTMLElement>(FLOATING_ROOT))
