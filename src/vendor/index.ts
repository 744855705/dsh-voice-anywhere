/**
 * The only door into the vendored official sources.
 *
 * Everything here is a verbatim copy (see `PROVENANCE.json`); business code
 * imports through this barrel so the vendored tree stays replaceable.
 */
export { VoiceInput } from './voice-input/VoiceInput.tsx'
export { Recording } from './voice-input/audio.ts'
export { createMicrophoneDeviceStore } from './voice-input/microphone-device.ts'
