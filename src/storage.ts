/**
 * What the settings page owns in the browser.
 *
 * The configuration file decides whether the page exists at all; the chosen
 * triggers are per client, so a profile edit cannot silently overwrite them.
 */

const TRIGGERS_KEY = 'dsh.voice-anywhere.triggers'
const CLOSED_KEY = 'dsh.voice-anywhere.settings-closed'

/**
 * Key for one profile's close mark; a shared origin must not let one profile
 * hide another's page.
 * @param profile - profile name from the configuration.
 * @returns the storage key.
 */
function closedKey(profile: string): string {
  return `${CLOSED_KEY}:${profile}`
}

/**
 * Read the saved triggers.
 * @param fallback - value from the configuration file.
 * @returns the saved list, or the fallback when nothing was saved.
 */
export function loadTriggerText(fallback: readonly string[]): string[] {
  try {
    const raw = localStorage.getItem(TRIGGERS_KEY)
    if (raw === null) return [...fallback]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...fallback]
    return parsed.filter((entry): entry is string => typeof entry === 'string')
  } catch {
    return [...fallback]
  }
}

/**
 * Persist the chosen triggers.
 * @param values - expressions to keep.
 */
export function saveTriggerText(values: readonly string[]): void {
  try {
    localStorage.setItem(TRIGGERS_KEY, JSON.stringify(values))
  } catch {
    // Private mode or a quota refusal: the session still works, just unsaved.
  }
}

/**
 * Whether the page was closed from inside for this exact configuration version.
 * @param revision - host revision of the file.
 * @returns whether the page should stay hidden.
 */
export function isPageClosed(revision: string, profile: string): boolean {
  try {
    return localStorage.getItem(closedKey(profile)) === revision
  } catch {
    return false
  }
}

/**
 * Remember that the page was closed for this configuration version. Editing the
 * file produces a new revision, which re-opens the page.
 * @param revision - host revision of the file.
 */
export function closePage(revision: string, profile: string): void {
  try {
    localStorage.setItem(closedKey(profile), revision)
  } catch {
    // Nothing to remember; the page simply stays visible.
  }
}
