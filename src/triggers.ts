/**
 * Custom triggers: the combinations the official shortcut catalog refuses.
 *
 * The web build only accepts three Linux combinations, so a profile that wants
 * another one declares it as text and this module matches it directly. Matching
 * never decides what should happen — `activate.ts` does — so a trigger and the
 * official shortcut can never disagree.
 */

/** One parsed trigger. */
export type Trigger =
  | { readonly kind: 'key'; readonly code: string; readonly ctrl: boolean; readonly alt: boolean; readonly shift: boolean; readonly meta: boolean }
  | { readonly kind: 'mouse'; readonly button: number }

const MODIFIER_NAMES: Readonly<Record<string, 'ctrl' | 'alt' | 'shift' | 'meta'>> = {
  ctrl: 'ctrl',
  control: 'ctrl',
  alt: 'alt',
  option: 'alt',
  shift: 'shift',
  meta: 'meta',
  cmd: 'meta',
  command: 'meta',
  super: 'meta',
  win: 'meta',
}

const MOUSE_BUTTONS: Readonly<Record<string, number>> = {
  back: 3,
  forward: 4,
  middle: 1,
  '3': 3,
  '4': 4,
}

/** Key names whose browser spelling is not the single character the user typed. */
const NAMED_CODES: Readonly<Record<string, string>> = {
  space: 'Space',
  enter: 'Enter',
  esc: 'Escape',
  escape: 'Escape',
  tab: 'Tab',
  backspace: 'Backspace',
  delete: 'Delete',
  insert: 'Insert',
  home: 'Home',
  end: 'End',
  pageup: 'PageUp',
  pagedown: 'PageDown',
  arrowup: 'ArrowUp',
  arrowdown: 'ArrowDown',
  arrowleft: 'ArrowLeft',
  arrowright: 'ArrowRight',
  slash: 'Slash',
  comma: 'Comma',
  period: 'Period',
  backslash: 'Backslash',
  backquote: 'Backquote',
  minus: 'Minus',
  equal: 'Equal',
  semicolon: 'Semicolon',
  quote: 'Quote',
  bracketleft: 'BracketLeft',
  bracketright: 'BracketRight',
}

/** Punctuation the user types as itself rather than by name. */
const PUNCTUATION: Readonly<Record<string, string>> = {
  ',': 'Comma',
  '.': 'Period',
  '/': 'Slash',
  '\\': 'Backslash',
  '`': 'Backquote',
  '-': 'Minus',
  '=': 'Equal',
  ';': 'Semicolon',
  "'": 'Quote',
  '[': 'BracketLeft',
  ']': 'BracketRight',
}

/**
 * Normalize one key token to `KeyboardEvent.code`.
 * @param token - token from the configuration.
 * @returns the code, or null when the token is not a key this plugin knows.
 */
function codeOf(token: string): string | null {
  const lower = token.toLowerCase()
  const named = NAMED_CODES[lower] ?? PUNCTUATION[token]
  if (named !== undefined) return named
  if (/^f([1-9]|1[0-9]|2[0-4])$/u.test(lower)) return token.toUpperCase()
  if (/^[a-z]$/u.test(lower)) return `Key${lower.toUpperCase()}`
  if (/^numpad[a-z0-9]+$/u.test(lower)) return token
  if (/^[0-9]$/u.test(lower)) return `Digit${lower}`
  if (lower.startsWith('media')) return token
  return null
}

/**
 * Parse one trigger expression.
 * @param text - e.g. `Ctrl+Shift+Space`, `Mouse:Back`, `MediaPlayPause`.
 * @returns the trigger, or null when the expression is not usable.
 */
export function parseTrigger(text: string): Trigger | null {
  const trimmed = text.trim()
  if (trimmed === '') return null

  const mouse = /^mouse:(.+)$/iu.exec(trimmed)
  if (mouse !== null) {
    const button = MOUSE_BUTTONS[mouse[1].trim().toLowerCase()]
    return button === undefined ? null : { kind: 'mouse', button }
  }

  const parts = trimmed.split('+').map(part => part.trim()).filter(part => part !== '')
  const keyPart = parts[parts.length - 1]
  if (keyPart === undefined) return null
  const code = codeOf(keyPart)
  if (code === null) return null

  const modifiers = { ctrl: false, alt: false, shift: false, meta: false }
  for (const part of parts.slice(0, -1)) {
    const modifier = MODIFIER_NAMES[part.toLowerCase()]
    if (modifier === undefined) return null
    modifiers[modifier] = true
  }

  // A bare letter would fire while typing; media keys and function keys are the
  // only ones that make sense without a modifier.
  const standalone = /^(Media|F\d)/iu.test(code)
  if (!standalone && !modifiers.ctrl && !modifiers.alt && !modifiers.shift && !modifiers.meta) return null

  return { kind: 'key', code, ...modifiers }
}

/**
 * Parse a configured list, dropping unusable entries.
 * @param values - trigger expressions.
 * @returns the parsed triggers.
 */
export function parseTriggers(values: readonly string[]): Trigger[] {
  const parsed: Trigger[] = []
  for (const value of values) {
    const trigger = parseTrigger(value)
    if (trigger !== null) parsed.push(trigger)
  }
  return parsed
}

/**
 * Whether a keyboard event matches one trigger.
 * @param trigger - parsed trigger.
 * @param event - the keydown.
 * @returns whether it matches on code and modifiers.
 */
export function matchesKey(trigger: Trigger, event: KeyboardEvent): boolean {
  if (trigger.kind !== 'key') return false
  const key = (event as { key?: string }).key ?? ''
  // `code` is the physical key and always present for real hardware; `key` is
  // the fallback for synthesized events that carry no code (media keys).
  const sameKey = event.code !== '' ? event.code === trigger.code : (key !== '' && key === trigger.code)
  if (!sameKey) return false
  return event.ctrlKey === trigger.ctrl
    && event.altKey === trigger.alt
    && event.shiftKey === trigger.shift
    && event.metaKey === trigger.meta
}

/**
 * Whether a mouse event matches one trigger.
 * @param trigger - parsed trigger.
 * @param event - the mousedown.
 * @returns whether it matches the configured button.
 */
export function matchesMouse(trigger: Trigger, event: MouseEvent): boolean {
  return trigger.kind === 'mouse' && event.button === trigger.button
}

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

/** Modifier keys produce no expression of their own. */
const MODIFIER_CODES: ReadonlySet<string> = new Set(['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight'])

/**
 * Describe a captured event as a configuration expression.
 * @param event - the keydown or mousedown that was captured.
 * @returns the expression, or null for a bare modifier or an unusable event.
 */
export function expressionOf(event: KeyboardEvent | MouseEvent): string | null {
  if ('button' in event) {
    if (event.button === 3) return 'Mouse:Back'
    if (event.button === 4) return 'Mouse:Forward'
    return null
  }
  if (MODIFIER_CODES.has(event.code)) return null
  const tokens: string[] = []
  if (event.ctrlKey) tokens.push('Ctrl')
  if (event.altKey) tokens.push('Alt')
  if (event.shiftKey) tokens.push('Shift')
  if (event.metaKey) tokens.push('Meta')
  // Named keys are described by code, never by the character they produce:
  // Shift+, would otherwise become "<", which parses back as nothing.
  const code = event.code
  if (code === '') return null
  const token = code.startsWith('Key') ? code.slice(3) : code.startsWith('Digit') ? code.slice(5) : code
  tokens.push(token)
  const expression = tokens.join('+')
  // Only an expression that parses back can ever fire.
  return parseTrigger(expression) === null ? null : expression
}
