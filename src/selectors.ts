/**
 * The DOM markers this plugin keys on.
 *
 * One definition each: the official `Modal` writes `data-shortcut-modal`, the
 * question card writes `data-question-key`, and the opt-in marker is ours. A
 * copy of any of these literals elsewhere is a bug waiting for a rename.
 */
export const SELECTORS = {
  questionCard: '[data-question-key]',
  dialog: '[role="dialog"][aria-modal="true"]',
  shortcuts: '[data-shortcut-modal="shortcuts"]',
  settings: '[data-shortcut-modal="settings"]',
  platform: '[data-shortcut-modal="platform"]',
  marker: '[data-voice-input]',
} as const
