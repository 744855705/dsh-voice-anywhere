/**
 * Decide whether the vendored official UI still matches the running one.
 *
 * The evidence is the boot graph's `rev`: a content hash of the official client
 * artifact, available on every platform. A revision change means the official
 * code changed; an unchanged revision means it did not, whatever the release
 * version says. The guard never refuses to run — a copy that still works keeps
 * working — it only tells the user what to do next.
 */
import type { OfficialBaseline } from './official-baseline.ts'

/** What the page and the build say, plus what this browser remembers. */
export interface OfficialSignals {
  /** Official client entry revision, or null when the entry is absent. */
  readonly rev: string | null
  /** DSH release version, or null when the host publishes none. */
  readonly releaseVersion: string | null
  /** Official package version this build vendored. */
  readonly builtVersion: string
  /** Baseline recorded on a previous run; null on the first one. */
  readonly baseline: OfficialBaseline | null
}

/** How the vendored copy relates to the running one. */
export type OfficialState = 'match' | 'changed' | 'unknown'

/** The verdict the UI renders from. */
export interface OfficialVerdict {
  readonly state: OfficialState
  /** Revision this run saw. */
  readonly rev: string | null
  /** Revision recorded on the run that established the baseline. */
  readonly baselineRev: string | null
  /** Short machine reason for `unknown`; null otherwise. */
  readonly reason: string | null
  /** Whether the caller should record this run as the new baseline. */
  readonly adopt: boolean
}

/**
 * Compare the running official client with this build.
 * @param signals - revision, release version, build version and the baseline.
 * @returns the verdict.
 */
export function evaluateOfficial(signals: OfficialSignals): OfficialVerdict {
  const { rev, releaseVersion, builtVersion, baseline } = signals
  const base = { rev, baselineRev: baseline?.rev ?? null }

  // Nothing to compare against: the official entry is not loaded (or the host
  // publishes no boot graph). Say so rather than guess.
  if (rev === null) return { ...base, state: 'unknown', reason: 'official entry missing', adopt: false }

  // A baseline recorded by another build says nothing about this one.
  if (baseline !== null && baseline.built === builtVersion) {
    return baseline.rev === rev
      ? { ...base, state: 'match', reason: null, adopt: false }
      : { ...base, state: 'changed', reason: null, adopt: true }
  }

  // First run (or first run after this build changed): the revision cannot be
  // compared yet, so fall back to the release version as a weak signal.
  if (releaseVersion !== null && releaseVersion !== builtVersion) {
    return { ...base, state: 'unknown', reason: `host ${releaseVersion} != built ${builtVersion}`, adopt: true }
  }
  return { ...base, state: 'match', reason: null, adopt: true }
}
