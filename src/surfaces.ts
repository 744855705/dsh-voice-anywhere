/**
 * Which surface the current focus belongs to.
 *
 * A surface is the smallest thing that decides both whether the microphone may
 * appear and where it goes: the official composer (never ours), the question
 * card, a dialog, the shortcut reference, or a plain field.
 */
import { currentConfig, type VoiceConfig } from './config.ts'
import { isSurfaceVisible } from './policy.ts'
import { classify, type EditableKind } from './targets.ts'
import { SELECTORS } from './selectors.ts'
import type { SurfaceKind } from './types.ts'

/** Hosts worth scanning when nothing has focus; the card, every dialog, the reference. */
const DOCK_HOSTS = `${SELECTORS.questionCard}, ${SELECTORS.dialog}, ${SELECTORS.shortcuts}`

/** One resolved surface and the field it dictates into. */
export interface Surface {
  readonly kind: SurfaceKind
  /** Whether the field already holds focus. */
  readonly focused: boolean
  readonly host: HTMLElement | null
  readonly field: HTMLElement
  readonly fieldKind: EditableKind
}

/**
 * Find the first editable inside a host.
 * @param host - question card, dialog, or shortcut reference.
 * @returns the editable, or null when the host offers none.
 */
function fieldWithin(host: HTMLElement): { element: HTMLElement; kind: EditableKind } | null {
  for (const element of host.querySelectorAll('textarea, input, [contenteditable="true"], [contenteditable=""]')) {
    const found = classify(element)
    if (found !== null) return { element: found.element, kind: found.kind }
  }
  return null
}

/**
 * Name the surface an editable belongs to.
 * @param element - the editable.
 * @param fieldKind - its classification.
 * @param focused - whether it holds focus.
 * @returns the resolved surface.
 */
function surfaceOf(element: HTMLElement, fieldKind: EditableKind, focused: boolean): Surface {
  const card = element.closest(SELECTORS.questionCard)
  if (card instanceof HTMLElement) {
    return { kind: 'question-card', focused, host: card, field: element, fieldKind }
  }
  const shortcuts = element.closest(SELECTORS.shortcuts)
  if (shortcuts instanceof HTMLElement) {
    return { kind: 'shortcuts', focused, host: shortcuts, field: element, fieldKind }
  }
  const dialog = element.closest(SELECTORS.dialog)
  if (dialog instanceof HTMLElement) {
    return { kind: 'dialog', focused, host: dialog, field: element, fieldKind }
  }
  return { kind: 'plain', focused, host: null, field: element, fieldKind }
}

/**
 * Name a host scanned by selector, without asking the field for its ancestry.
 * @param host - element matched by `DOCK_HOSTS`.
 * @returns its surface kind.
 */
function kindOfHost(host: HTMLElement): SurfaceKind {
  if (host.matches(SELECTORS.questionCard)) return 'question-card'
  if (host.matches(SELECTORS.shortcuts)) return 'shortcuts'
  if (host.matches(SELECTORS.dialog)) return 'dialog'
  return 'plain'
}

/**
 * Resolve the surface that owns the control right now.
 *
 * Focus decides first. Without focus, only a host can carry the control, so the
 * highest host with an editable is considered — newest first, because dialogs
 * are appended to the body.
 * @param config - configuration in force.
 * @returns the visible surface, or null when nothing may show the control.
 */
export function findSurface(config: VoiceConfig = currentConfig()): Surface | null {
  const focused = classify(document.activeElement)
  if (focused !== null) {
    const surface = surfaceOf(focused.element, focused.kind, true)
    return isSurfaceVisible(surface.field, surface.kind, config) ? surface : null
  }
  const hosts = document.querySelectorAll<HTMLElement>(DOCK_HOSTS)
  for (let index = hosts.length - 1; index >= 0; index -= 1) {
    const host = hosts[index]
    const field = fieldWithin(host)
    if (field === null) continue
    const surface: Surface = { kind: kindOfHost(host), focused: false, host, field: field.element, fieldKind: field.kind }
    if (isSurfaceVisible(surface.field, surface.kind, config)) return surface
  }
  return null
}
