/**
 * Microphone capture, reused from the official client source.
 *
 * `Recording` owns permission, MediaRecorder and the 16 kHz mono WAV encoding
 * the Host validates, so duplicating it would only add a way to drift from the
 * official button. The device preference is the one the official picker saved:
 * it is re-read on every capture because that picker writes the same key.
 */
import { Recording } from 'voice-official/audio.ts'
import { createMicrophoneDeviceStore } from 'voice-official/microphone-device.ts'

/** Persistence key owned by the official microphone picker. */
const DEVICE_KEY = 'dsh.voice-input.microphone'

export function createRecorder() {
  const devices = createMicrophoneDeviceStore()
  const live = new Set<Recording>()

  /**
   * Read the currently chosen microphone; the store is only a fallback because
   * another plugin instance may have written the key after we mounted.
   * @returns a device id, or an empty string for the system default.
   */
  const currentDeviceId = (): string => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(DEVICE_KEY) ?? 'null')
      if (saved !== null && typeof saved === 'object' && 'id' in saved) {
        const id = (saved as { id?: unknown }).id
        if (typeof id === 'string') return id
      }
    } catch {
      // An unreadable preference falls back to the shared store.
    }
    return devices.getSnapshot().id
  }

  return {
    devices,
    /** @returns one capture owned by this plugin's lifetime. */
    createRecording: (): Recording => {
      let recording: Recording
      recording = new Recording(() => { live.delete(recording) }, currentDeviceId())
      live.add(recording)
      return recording
    },
    /** Release every capture still open when the plugin unloads. */
    dispose: (): void => {
      for (const recording of live) void recording.dispose()
      live.clear()
    },
  }
}
