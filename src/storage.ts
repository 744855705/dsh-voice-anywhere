/**
 * What the settings page owns in the browser.
 *
 * The configuration file decides whether the page exists at all; the chosen
 * triggers are per client, so a profile edit cannot silently overwrite them.
 */

const TRIGGERS_KEY = 'dsh.voice-anywhere.triggers'
/** Shape version of the stored value; a legacy bare array is migrated on read. */
const STORAGE_VERSION = 1
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
    const parsed = parseStored(localStorage.getItem(TRIGGERS_KEY))
    return parsed ?? [...fallback]
  } catch {
    return [...fallback]
  }
}

/** One stored value: the current envelope, or the pre-0.1.1 bare array. */
interface StoredTriggers {
  readonly v: number
  readonly triggers: readonly string[]
}

/**
 * Parse a stored value, accepting both shapes.
 * @param raw - raw storage text, or null when nothing was stored.
 * @returns the trigger list, or null when the value is absent or unusable.
 */
function parseStored(raw: string | null): string[] | null {
  if (raw === null) return null
  const parsed: unknown = JSON.parse(raw)
  const list = Array.isArray(parsed)
    ? parsed
    : parsed !== null && typeof parsed === 'object' && Array.isArray((parsed as StoredTriggers).triggers)
      ? (parsed as StoredTriggers).triggers
      : null
  return list === null ? null : list.filter((entry): entry is string => typeof entry === 'string')
}

/**
 * Persist the chosen triggers.
 * @param values - expressions to keep.
 */
export function saveTriggerText(values: readonly string[]): void {
  try {
    localStorage.setItem(TRIGGERS_KEY, JSON.stringify({ v: STORAGE_VERSION, triggers: [...values] } satisfies StoredTriggers))
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
