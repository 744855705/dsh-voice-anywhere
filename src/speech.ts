/**
 * Access to the official speech capability.
 *
 * The voice package mounts its Remote namespace under its own plugin scope, so
 * a sibling plugin reads it by service name (`ctx.get`) and may find nothing
 * until that plugin has mounted. Nothing here is a hard dependency: a missing
 * service leaves the readiness snapshot unavailable, and the reused component
 * then shows its own setup affordance instead of failing.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { note } from './diagnostics.ts'

/** How often the catalog is re-read when the live stream is unavailable. */
const POLL_MS = 20_000

/** The namespace the official voice plugin mounts at startup. */
export const SPEECH_SERVICE = 'remote.speech'

export interface SpeechReadiness {
  readonly catalog: unknown
  readonly connected: boolean
  readonly error: string | null
}

/** Minimal context face this module needs. */
export interface SpeechContext {
  get(name: string): unknown
}

/**
 * Pick the catalog out of either shape the namespace uses: a `RemoteResult`
 * envelope from `catalog()`, or the catalog itself as `follow()` yields it.
 * @param raw - method result or stream item.
 * @returns the catalog, or null when the value is not one.
 */
function catalogOf(raw: unknown): unknown {
  if (raw === null || typeof raw !== 'object') return null
  if ('ok' in raw) return (raw as { ok: boolean; value?: unknown }).ok === true ? (raw as { value?: unknown }).value ?? null : null
  const value = (raw as { value?: unknown }).value
  if (value !== undefined) return value
  return Array.isArray((raw as { providers?: unknown }).providers) ? raw : null
}

/**
 * Describe a failed Remote result without leaking its shape into callers.
 * @param result - Remote result or transport error.
 * @returns a short reason for the readiness snapshot.
 */
function reasonOf(result: unknown): string {
  if (result !== null && typeof result === 'object' && 'error' in result) {
    const error = (result as { error?: { message?: string } }).error
    return error?.message ?? 'speech request failed'
  }
  return 'speech request failed'
}

/**
 * Bind the speech Remote namespace lazily.
 * @param ctx - plugin context used for service lookup.
 * @returns readiness snapshot plus the calls the button needs.
 */
export function createSpeech(ctx: SpeechContext) {
  const store = createSnapshotStore<SpeechReadiness>({ catalog: null, connected: false, error: null })

  const service = (): any => {
    try {
      return ctx.get(SPEECH_SERVICE) ?? null
    } catch {
      return null
    }
  }

  const requireService = (): any => {
    const speech = service()
    if (speech === null) throw new Error(`speech service unavailable (${SPEECH_SERVICE})`)
    return speech
  }

  /**
   * Publish one snapshot and leave the numbers where a field report can find
   * them: "not ready" has three very different causes.
   * @param next - the snapshot to publish.
   */
  const publish = (next: SpeechReadiness): void => {
    store.set(next)
    note({ readiness: { connected: next.connected, catalog: next.catalog !== null, error: next.error } })
  }

  /**
   * Read one catalog snapshot: the same provider selection and limits the
   * official button uses, which is why no preference logic lives here.
   * @returns after the snapshot settles.
   */
  const refresh = async (): Promise<void> => {
    const speech = service()
    if (speech === null) {
      publish({ catalog: null, connected: false, error: 'unavailable' })
      return
    }
    try {
      const result = await speech.catalog()
      const catalog = catalogOf(result)
      if (catalog !== null) {
        publish({ catalog, connected: true, error: null })
        return
      }
      publish({ ...store.getSnapshot(), connected: false, error: reasonOf(result) })
    } catch (error) {
      publish({ ...store.getSnapshot(), connected: false, error: String(error) })
    }
  }

  let disposed = false
  const timers = new Set<number>()

  /**
   * Re-read the catalog on a fixed cadence.
   *
   * Polling is the fallback for a namespace without `follow`, and the path taken
   * after a stream ends. It owns connectivity: only a catalog answer can declare
   * the feature unavailable.
   * @param delay - milliseconds before the next read.
   */
  const poll = (delay = POLL_MS): void => {
    if (disposed) return
    const id = setTimeout(() => {
      timers.delete(id)
      void refresh().then(() => poll(delay))
    }, delay)
    timers.add(id)
  }

  /**
   * Keep readiness live instead of reading one snapshot.
   *
   * The official namespace exposes `follow`; its items carry the same catalog.
   * A stream that ends or fails says nothing about host readiness, so the last
   * snapshot is kept and polling takes over — never a fabricated "not ready".
   */
  const observe = async (): Promise<void> => {
    await refresh()
    const speech = service()
    if (disposed) return
    if (speech === null || typeof speech.follow !== 'function') {
      poll()
      return
    }
    const controller = new AbortController()
    try {
      for await (const item of speech.follow(controller.signal)) {
        if (disposed) {
          controller.abort()
          return
        }
        const catalog = catalogOf(item)
        if (catalog !== null) {
          publish({ catalog, connected: true, error: null })
          // A wrapped item (the official `$stream` carrier) needs its ack; a raw
          // handle yields the catalog itself.
          ;(item as { accept?: () => void }).accept?.()
        }
      }
    } catch (error) {
      // Keep the snapshot; record why the live path stopped.
      note({ readinessStream: String(error) })
    }
    if (!disposed) poll()
  }

  /**
   * Stop observing and cancel every pending read.
   */
  const dispose = (): void => {
    disposed = true
    for (const id of timers) clearTimeout(id)
    timers.clear()
  }

  return {
    store,
    refresh,
    observe,
    dispose,
    transcribe: (request: unknown, signal: AbortSignal) => requireService().transcribe(request, signal),
    configure: async (patch: unknown): Promise<void> => {
      const result = await requireService().configure(patch)
      if (result?.ok === false) throw result.error
    },
    prepare: async (providerId: string, options?: unknown): Promise<void> => {
      const result = await requireService().prepare(providerId, options)
      if (result?.ok === false) throw result.error
    },
    cancelPreparation: async (providerId: string): Promise<void> => {
      const result = await requireService().cancelPreparation(providerId)
      if (result?.ok === false) throw result.error
    },
  }
}
