/**
 * Which editable surfaces may show the microphone.
 *
 * The rule is deny-by-default: only a surface this module names can show the
 * control, and the configuration can only narrow or extend that list — never
 * the official composer, which this plugin does not govern.
 *
 * Vocabulary the rule leans on:
 * - `[data-shortcut-modal="…"]` — the marker the official `Modal` writes, so
 *   "this is the settings panel" needs no class-name guessing;
 * - `[data-voice-input]` — the opt-in marker any field or ancestor can carry;
 * - the profile configuration's `allow` selectors and `disable` list.
 */
import type { VoiceConfig } from './config.ts'
import { SELECTORS } from './selectors.ts'
import type { SurfaceKind } from './types.ts'

/**
 * Whether a selector matches the element or one of its ancestors.
 * @param element - candidate editable.
 * @param selector - user-supplied selector.
 * @returns whether it matches; an invalid selector matches nothing.
 */
function matchesScope(element: HTMLElement, selector: string): boolean {
  try {
    return element.closest(selector) !== null
  } catch {
    // A typo in the configuration must not break dictation elsewhere.
    return false
  }
}

/**
 * Decide whether the control may appear for one surface.
 * @param element - the editable in question.
 * @param kind - surface family resolved by `surfaces.ts`.
 * @param config - configuration in force.
 * @returns whether the surface is visible to the plugin.
 */
export function isSurfaceVisible(element: HTMLElement, kind: SurfaceKind, config: VoiceConfig): boolean {
  // Contexts that never take dictation, whatever the surface form.
  if (element.closest(SELECTORS.settings) !== null || element.closest(SELECTORS.platform) !== null) return false

  if (kind === 'shortcuts') return !config.disable.includes('shortcuts')

  // A dialog opened from the settings panel (plugin install, model editor) is
  // portalled to the body, so it carries no settings ancestor of its own.
  if (kind === 'dialog' && document.querySelector(SELECTORS.settings) !== null) return false

  if (kind === 'question-card') return !config.disable.includes('question-card')
  if (kind === 'dialog') return !config.disable.includes('dialog')

  // A plain field opts in either by marker or by a configured selector.
  if (element.closest(SELECTORS.marker) !== null) return true
  return config.allow.some(selector => matchesScope(element, selector))
}

/** The selectors this rule is built on, re-exported for tests and documentation. */
export const POLICY_SELECTORS = SELECTORS
