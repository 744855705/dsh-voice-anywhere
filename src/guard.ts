/**
 * Decide whether the vendored official UI still matches what is installed.
 *
 * A hash, not a version: DSH ships weekly and a version bump says nothing
 * about these files, while any edit to them changes the hash. The verdict never
 * refuses to run — a copy that still works should keep working — it only tells
 * the user what to do next.
 */
/** What the host could read from the installed package. */
export interface OfficialProbe {
  readonly version: string | null
  readonly hash: string | null
  readonly reason: string | null
}

/** How the vendored copy relates to the installed one. */
export type OfficialState = 'match' | 'mismatch' | 'unknown'

/** The verdict the UI renders from. */
export interface OfficialVerdict {
  readonly state: OfficialState
  /** Hash this build was compiled against. */
  readonly built: string
  /** Hash of the installed package, when it could be read. */
  readonly installed: string | null
  /** Why the probe failed, for `unknown`. */
  readonly reason: string | null
}

/**
 * Compare this build's vendored hash with the installed package's.
 * @param probe - host answer; absent when the configuration request failed.
 * @param built - hash this build was compiled against.
 * @returns the verdict.
 */
export function evaluateOfficial(probe: OfficialProbe | null | undefined, built: string): OfficialVerdict {
  if (probe === null || probe === undefined || probe.hash === null) {
    return { state: 'unknown', built, installed: null, reason: probe?.reason ?? 'configuration unavailable' }
  }
  return probe.hash === built
    ? { state: 'match', built, installed: probe.hash, reason: null }
    : { state: 'mismatch', built, installed: probe.hash, reason: null }
}
