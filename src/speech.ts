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
   * Read one catalog snapshot: the same provider selection and limits the
   * official button uses, which is why no preference logic lives here.
   * @returns after the snapshot settles.
   */
  const refresh = async (): Promise<void> => {
    const speech = service()
    if (speech === null) {
      store.set({ catalog: null, connected: false, error: 'unavailable' })
      return
    }
    try {
      const result = await speech.catalog()
      if (result !== null && typeof result === 'object' && result.ok === true) {
        store.set({ catalog: result.value, connected: true, error: null })
        return
      }
      store.set({ ...store.getSnapshot(), connected: false, error: reasonOf(result) })
    } catch (error) {
      store.set({ ...store.getSnapshot(), connected: false, error: String(error) })
    }
  }

  let disposed = false
  const timers = new Set<number>()

  /**
   * Keep readiness live instead of reading one snapshot.
   *
   * The official namespace exposes `follow`; a quiet stream, a missing method,
   * or a transport failure all fall back to a bounded retry, so a speech plugin
   * that mounts after this one still turns the button on without a reload.
   * @param attempt - retry depth, used only to space the backoff.
   */
  const observe = async (attempt = 0): Promise<void> => {
    const speech = service()
    if (speech === null || typeof speech.follow !== 'function') {
      await refresh()
      if (!disposed) {
        const id = setTimeout(() => { timers.delete(id); void observe(attempt) }, Math.min(30_000, 1_000 * 2 ** attempt))
        timers.add(id)
      }
      return
    }
    const controller = new AbortController()
    try {
      for await (const item of speech.follow(controller.signal)) {
        if (disposed) {
          controller.abort()
          return
        }
        const value = (item as { value?: unknown }).value
        if (value !== undefined) {
          store.set({ catalog: value, connected: true, error: null })
          ;(item as { accept?: () => void }).accept?.()
        }
      }
    } catch (error) {
      store.set({ ...store.getSnapshot(), connected: false, error: String(error) })
    }
    if (!disposed) {
      const id = setTimeout(() => { timers.delete(id); void observe(attempt + 1) }, Math.min(15_000, 500 * 2 ** attempt))
      timers.add(id)
    }
  }

  /**
   * Stop observing.
   * @returns nothing.
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
