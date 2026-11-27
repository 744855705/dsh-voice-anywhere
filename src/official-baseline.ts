/**
 * Where the official client's identity comes from, and where the baseline lives.
 *
 * The page already carries a content hash for every client entry: the boot
 * graph's `rev`. Comparing that with a recorded baseline detects a changed
 * official build on any platform, without reading package directories. The
 * baseline is per browser, so a fresh browser compares the release version and
 * adopts what it finds.
 */

/** Storage key for the recorded official revision. */
const BASELINE_KEY = 'dsh.voice-anywhere.official-rev'

/** A recorded pair of build identity and official revision. */
export interface OfficialBaseline {
  /** Version of the official package this plugin was built against. */
  readonly built: string
  /** Official client entry revision seen on the run that recorded it. */
  readonly rev: string
}

/** What the running page says about the official client. */
export interface BootSignals {
  /** Content revision of the official voice client entry, when it is loaded. */
  readonly rev: string | null
  /** Release version of this DSH host. */
  readonly releaseVersion: string | null
}

/**
 * Read the official entry's revision and the host release from the boot graph.
 * @returns both values, each null when the page does not expose it.
 */
export function readBootSignals(): BootSignals {
  const boot = (window as unknown as { __DSH_BOOT__?: { entries?: { id?: string; rev?: string }[]; release?: { version?: string } } }).__DSH_BOOT__
  const entries = boot?.entries ?? []
  // The official client row is the voice-input package; `dsh-voice-anywhere` is
  // this plugin and must not match.
  const entry = entries.find(item => typeof item.id === 'string' && item.id.includes('voice-input'))
  return {
    rev: typeof entry?.rev === 'string' ? entry.rev : null,
    releaseVersion: typeof boot?.release?.version === 'string' ? boot.release.version : null,
  }
}

/**
 * Read the recorded baseline.
 * @returns the baseline, or null when this browser has none or it is unreadable.
 */
export function readBaseline(): OfficialBaseline | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(BASELINE_KEY) ?? 'null')
    if (parsed === null || typeof parsed !== 'object') return null
    const built = (parsed as { built?: unknown }).built
    const rev = (parsed as { rev?: unknown }).rev
    return typeof built === 'string' && typeof rev === 'string' ? { built, rev } : null
  } catch {
    return null
  }
}

/**
 * Record a baseline, ignoring storage that refuses to keep it.
 * @param baseline - the pair to remember.
 */
export function writeBaseline(baseline: OfficialBaseline): void {
  try {
    localStorage.setItem(BASELINE_KEY, JSON.stringify(baseline))
  } catch {
    // Private mode: the guard still works, it just cannot remember across runs.
  }
}
