/**
 * One line of status the user must see (not a toast: it stays until the state
 * it describes changes).
 */
import { createElement as h } from 'react'

/** Severity of the message. */
export type NoticeTone = 'warn' | 'danger' | 'muted'

const TONE: Record<NoticeTone, { color: string; background: string }> = {
  warn: { color: '#7a4b00', background: 'rgba(255, 187, 0, 0.12)' },
  danger: { color: '#8b1d1d', background: 'rgba(229, 72, 77, 0.12)' },
  muted: { color: 'inherit', background: 'rgba(128, 128, 128, 0.12)' },
}

/**
 * Render the notice.
 * @param props - tone and text.
 * @returns the notice element.
 */
export function Notice(props: { tone: NoticeTone; text: string }) {
  const tone = TONE[props.tone]
  return h('p', {
    role: 'status',
    style: {
      margin: 0,
      padding: '8px 10px',
      borderRadius: '8px',
      fontSize: '12px',
      lineHeight: 1.5,
      color: tone.color,
      background: tone.background,
    },
  }, props.text)
}
