/**
 * The official-code verdict, shared by the surfaces that report it.
 *
 * One module-level value rather than prop drilling: the answer arrives from the
 * configuration request and is read by unrelated surfaces (the floating control,
 * its error boundary, the settings page).
 */
import type { OfficialVerdict } from './guard.ts'

let verdict: OfficialVerdict | null = null
let blocked = false

/**
 * Store the current verdict.
 * @param next - the verdict to publish.
 */
export function setVerdict(next: OfficialVerdict): void {
  verdict = next
}

/** @returns the current verdict, or null before the configuration arrives. */
export function verdictOf(): OfficialVerdict | null {
  return verdict
}

/**
 * Record that the control failed to render, which means the copy is not merely
 * newer or older but incompatible.
 */
export function markBlocked(): void {
  blocked = true
}

/** @returns whether the control had to be taken down. */
export function isBlocked(): boolean {
  return blocked
}
