/**
 * The single writer of `window.__voiceAnywhere`.
 *
 * Every module that wants to leave a trace goes through here: one shape, one
 * retention bound, one place to look when a build misbehaves in the field.
 * Diagnostics never affect behaviour — a failed publish is swallowed on purpose.
 */

import { verdictOf } from './stale.ts'

/** One recorded failure. */
export interface DiagnosticEvent {
  readonly kind: string
  readonly message: string
  readonly at: string
}

/** Everything published under `window.__voiceAnywhere`. */
export interface DiagnosticSnapshot extends Record<string, unknown> {
  readonly events: readonly DiagnosticEvent[]
}

const MAX_EVENTS = 50

let facts: Record<string, unknown> = {}
let events: DiagnosticEvent[] = []

/** Publish the current snapshot, ignoring a window that cannot hold it. */
function publish(): void {
  try {
    ;(window as any).__voiceAnywhere = withStale({ ...facts, events: [...events] }) satisfies DiagnosticSnapshot
  } catch {
    // A diagnostic surface must never be able to break the feature.
  }
}

/**
 * Replace the published surface.
 * @param initial - build metadata and any facts known at start-up.
 */
export function installDiagnostics(initial: Record<string, unknown>): void {
  facts = { ...initial }
  events = []
  publish()
}

/**
 * Record a handled failure and report it once on the console.
 * @param kind - short tag naming the failing step.
 * @param error - the thrown value.
 */
export function report(kind: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error)
  events.push({ kind, message, at: new Date().toISOString() })
  if (events.length > MAX_EVENTS) events.shift()
  publish()
  console.warn(`[voice-anywhere] ${kind}: ${message}`)
}

/**
 * Attach one fact to the published surface.
 * @param patch - fields to merge.
 */
export function note(patch: Record<string, unknown>): void {
  facts = { ...facts, ...patch }
  publish()
}

/**
 * Attach the official-code verdict to the published surface.
 * @param value - current snapshot facts.
 * @returns the facts plus the stale state.
 */
function withStale<T extends Record<string, unknown>>(value: T): T & { stale: unknown } {
  return { ...value, stale: verdictOf() }
}

/** @returns a copy of the published surface. */
export function snapshot(): DiagnosticSnapshot {
  return withStale({ ...facts, events: [...events] })
}
