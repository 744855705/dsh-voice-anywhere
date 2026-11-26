/**
 * The injected share handed to the reused component.
 *
 * The official `VoiceInput` calls back into its host for recording, transport
 * and navigation; this module is that host face, assembled once so `client.ts`
 * stays an assembly script.
 */
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { report } from './diagnostics.ts'
import type { createRecorder } from './recording.ts'
import type { createSpeech } from './speech.ts'

/** The bundle whose detail page hosts the setup guidance. */
const VOICE_BUNDLE = '@deepseek-ai/dsh-experimental-voice-input-bundle'

/** What the face needs from the plugin context and its two subsystems. */
export interface FaceSources {
  readonly ctx: any
  readonly speech: ReturnType<typeof createSpeech>
  readonly recorder: ReturnType<typeof createRecorder>
  readonly navigation: ReturnType<typeof createSnapshotStore<boolean>>
}

/**
 * Build the injected face.
 * @param sources - context, speech, recorder and the navigation mirror.
 * @returns the object the slot injects.
 */
export function createFace({ ctx, speech, recorder, navigation }: FaceSources) {
  return {
    hooks: {
      speechReadiness: speech.store,
      microphoneDevice: recorder.devices,
      pluginNavigation: navigation,
    },
    createRecording: () => recorder.createRecording(),
    transcribe: (request: unknown, signal: AbortSignal) => speech.transcribe(request, signal),
    openSettings: (): void => {
      try {
        ctx.get('pluginNavigation')?.openBundle(VOICE_BUNDLE)
      } catch (error) {
        report('open-settings', error)
      }
    },
    prepare: (providerId: string, options?: unknown) => speech.prepare(providerId, options),
    cancelPreparation: (providerId: string) => speech.cancelPreparation(providerId),
    configure: (patch: unknown) => speech.configure(patch),
    selectMicrophone: (device: { id: string; label: string }) => { recorder.devices.set(device) },
    refreshReadiness: () => speech.refresh(),
  }
}
