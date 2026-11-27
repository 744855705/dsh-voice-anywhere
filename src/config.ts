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
  /** Trigger expressions that start and stop dictation. */
  readonly triggers: readonly string[]
  /** Trigger expressions that submit, exactly as Enter would. */
  readonly submit: readonly string[]
  /** Whether this profile shows the plugin's own settings page; visible unless switched off. */
  readonly settingsPage: boolean
  /** Host-side revision of the file (content hash), used to tell "the user edited it" from "unchanged". */
  readonly revision: string
  /** Profile this configuration belongs to, so browser storage never mixes profiles. */
  readonly profile: string
  /** What the host read from the installed official package; absent on a failed request. */
  readonly official?: {
    readonly version: string | null
    readonly hash: string | null
    readonly reason: string | null
  }
}

/** Configuration used when the file is missing, unreadable, or invalid. */
export const DEFAULT_CONFIG: VoiceConfig = { allow: [], disable: [], triggers: [], submit: [], settingsPage: true, revision: '', profile: '' }

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
  const triggers = stringList((raw as { triggers?: unknown }).triggers)
  const submit = stringList((raw as { submit?: unknown }).submit)
  // Visible by default: only an explicit `false` hides it from the settings list.
  const settingsPage = (raw as { settingsPage?: unknown }).settingsPage !== false
  const revision = typeof (raw as { revision?: unknown }).revision === 'string' ? (raw as { revision: string }).revision : ''
  const profile = typeof (raw as { profile?: unknown }).profile === 'string' ? (raw as { profile: string }).profile : ''
  // The host's answer about the installed official package must survive
  // normalization; dropping it here silently pinned the guard at "unknown".
  const official = officialProbe((raw as { official?: unknown }).official)
  // Only present when the host answered, so an absent probe leaves the shape
  // callers already rely on unchanged.
  return { allow, disable, triggers, submit, settingsPage, revision, profile, ...(official === undefined ? {} : { official }) }
}

/**
 * Read the host's probe of the official package.
 * @param value - raw field value.
 * @returns the probe, or undefined when the host did not provide a usable one.
 */
function officialProbe(value: unknown): VoiceConfig['official'] {
  if (value === null || typeof value !== 'object') return undefined
  const hash = (value as { hash?: unknown }).hash
  const version = (value as { version?: unknown }).version
  const reason = (value as { reason?: unknown }).reason
  return {
    hash: typeof hash === 'string' ? hash : null,
    version: typeof version === 'string' ? version : null,
    reason: typeof reason === 'string' ? reason : null,
  }
}

/**
 * Keep the string entries of one list field.
 * @param value - raw field value.
 * @returns the usable expressions.
 */
function stringList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '')
    : []
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
