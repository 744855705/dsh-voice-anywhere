/**
 * The exact official files this plugin vendors.
 *
 * A closed list is the point: nothing else is copied, and adding a file is a
 * reviewable change here rather than an emergent side effect of an import.
 */
export const VENDOR_DIR = 'src/vendor/voice-input'

/** Official client sources the floating control needs, relative to the package. */
export const VENDOR_FILES = [
  'audio.ts',
  'failure-text.ts',
  'microphone-device.ts',
  'readiness.ts',
  'locales.ts',
  'MicrophonePicker.tsx',
  'PreparationCard.tsx',
  'VoiceInput.module.css',
  'VoiceInput.tsx',
  'VoiceSetupDialog.tsx',
  'VoiceSetupPrompt.tsx',
  'Waveform.tsx',
]
