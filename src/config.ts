/**
 * The plugin's own configuration, read from the active profile.
 *
 * The host half serves `GET /voice-anywhere/config.json`; this module fetches
 * it once at start-up and keeps the parsed value. The shape is deliberately
 * small: an allowlist of CSS selectors for plain fields, and the built-in
 * surfaces the user may switch off. The official composer is not part of this
 * vocabulary — the plugin never governs it.
 */

/** Built-in surfaces the configuration can switch off. */
export type PolicyTarget = 'question-card' | 'dialog' | 'shortcuts'

/** Parsed configuration. */
export interface VoiceConfig {
  /** CSS selectors of plain fields that opt in. */
  readonly allow: readonly string[]
  /** Built-in surfaces switched off. */
  readonly disable: readonly PolicyTarget[]
  /** Custom trigger expressions (`Ctrl+Shift+Space`, `Mouse:Back`, `MediaPlayPause`). */
  readonly triggers: readonly string[]
  /** Whether this profile shows the plugin's own settings page; visible unless switched off. */
  readonly settingsPage: boolean
  /** Host-side revision of the file (content hash), used to tell "the user edited it" from "unchanged". */
  readonly revision: string
  /** Profile this configuration belongs to, so browser storage never mixes profiles. */
  readonly profile: string
}

/** Configuration used when the file is missing, unreadable, or invalid. */
export const DEFAULT_CONFIG: VoiceConfig = { allow: [], disable: [], triggers: [], settingsPage: true, revision: '', profile: '' }

/** Where the host half publishes the profile's configuration. */
const CONFIG_URL = '/voice-anywhere/config.json'

const TARGETS: ReadonlySet<string> = new Set<PolicyTarget>(['question-card', 'dialog', 'shortcuts'])

let current: VoiceConfig = DEFAULT_CONFIG

/** @returns the configuration in force right now. */
export function currentConfig(): VoiceConfig {
  return current
}

/** Replace the configuration in force (loader and tests). */
export function setConfig(next: VoiceConfig): void {
  current = next
}

/**
 * Parse an unknown payload into a configuration, dropping anything off-schema.
 * @param raw - parsed JSON body.
 * @returns a configuration that is always safe to use.
 */
export function normalizeConfig(raw: unknown): VoiceConfig {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_CONFIG
  const allow = Array.isArray((raw as { allow?: unknown }).allow)
    ? ((raw as { allow: unknown[] }).allow.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== ''))
    : []
  const disable = Array.isArray((raw as { disable?: unknown }).disable)
    ? ((raw as { disable: unknown[] }).disable.filter((entry): entry is PolicyTarget => typeof entry === 'string' && TARGETS.has(entry)))
    : []
  const triggers = Array.isArray((raw as { triggers?: unknown }).triggers)
    ? ((raw as { triggers: unknown[] }).triggers.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== ''))
    : []
  // Visible by default: only an explicit `false` hides it from the settings list.
  const settingsPage = (raw as { settingsPage?: unknown }).settingsPage !== false
  const revision = typeof (raw as { revision?: unknown }).revision === 'string' ? (raw as { revision: string }).revision : ''
  const profile = typeof (raw as { profile?: unknown }).profile === 'string' ? (raw as { profile: string }).profile : ''
  return { allow, disable, triggers, settingsPage, revision, profile }
}

/**
 * Load the profile configuration once.
 *
 * A transport or parse failure rejects, so the caller can report it; the
 * configuration in force is left untouched, which means a broken host can never
 * widen what the plugin attaches to.
 * @param fetchImpl - fetch implementation, injectable for tests.
 * @returns the configuration now in force.
 * @throws when the route is unreachable or the body is not JSON.
 */
export async function loadConfig(fetchImpl: typeof fetch = fetch): Promise<VoiceConfig> {
  const response = await fetchImpl(CONFIG_URL, { credentials: 'same-origin' })
  if (!response.ok) throw new Error(`configuration route answered ${response.status}`)
  setConfig(normalizeConfig(await response.json()))
  return current
}
