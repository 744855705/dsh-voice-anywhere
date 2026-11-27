/**
 * The floating control's rendering: the official microphone in a portal, sized
 * and positioned by `use-surface-control`.
 *
 * Nothing about the button, its capture row or its feedback is reimplemented.
 */
import { createElement as h } from 'react'
import { createPortal } from 'react-dom'
import { VoiceInput } from '../vendor/index.ts'
import { ErrorBoundary } from '../components/error-boundary.ts'
import { report } from '../diagnostics.ts'
import { isBlocked, markBlocked, verdictOf } from '../stale.ts'
import { insertTranscript, type InsertionSpan } from '../insertion.ts'
import { useSurfaceControl } from './use-surface-control.ts'

/** The component only uses the id to reset its capture state. */
const FIXED_SESSION = 'voice-anywhere'

/**
 * Render the official microphone where the current editable needs it.
 * @param props - injected speech face, synthesized readiness hooks, translator.
 * @returns the portal, or null while no editable is available.
 */
export function FloatingMic(props: any) {
  const {
    createRecording, transcribe, openSettings, prepare, cancelPreparation, configure, selectMicrophone,
    refreshReadiness, useSpeechReadiness, useMicrophoneDevice, usePluginNavigation, t,
  } = props
  const { target, box, locked, setExpanded, rootRef } = useSurfaceControl(refreshReadiness)

  if (target === null || box === null) return null

  const inputActions = {
    captureInsertion: (): InsertionSpan | null => target.element.isConnected
      ? { element: target.element, kind: target.kind }
      : null,
    // Append somewhere rather than claim success: reporting false keeps the
    // transcript pending in the official row, where "insert" can retry it.
    insertText: (text: string, span: InsertionSpan | null): boolean => insertTranscript(text, span),
  }

  // A copy that no longer matches is still usable until it proves otherwise, so
  // the badge reports the state and only a render failure takes the control down.
  const state = isBlocked() ? 'broken' : verdictOf()?.state ?? 'unknown'
  const badge = state === 'match' ? null : h('span', {
    title: t(`badge.${state}`),
    style: {
      position: 'absolute',
      top: '-2px',
      right: '-4px',
      width: '6px',
      height: '6px',
      borderRadius: '50%',
      background: state === 'unknown' ? '#ffbb00' : '#e5484d',
      pointerEvents: 'none',
    },
  })

  // The wrapper never takes a click: only the control inside does. A transparent
  // strip that accepted clicks would cover the dialog's own buttons underneath.
  return createPortal(h('div', {
    'data-voice-anywhere-root': '',
    ref: rootRef,
    style: {
      position: 'fixed',
      left: `${box.left}px`,
      top: `${box.top}px`,
      width: `${box.width}px`,
      // The box top is the band's centre line; translating by half the control's
      // own height centres it without assuming that height.
      transform: 'translateY(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      pointerEvents: 'none',
    },
  // The badge lives in its own positioned box: a flex sibling next to the row
  // would take width from it and squeeze the control.
  }, h('div', {
    style: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%' },
  }, [
    h(ErrorBoundary, {
      key: 'control',
      onError: (error: unknown) => {
        markBlocked()
        report('render', error)
      },
    }, h('div', {
    style: {
      pointerEvents: 'auto',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      // No decoration: the official row draws only its own controls, and an
      // outer border or fill here would break that parity.
      boxSizing: 'border-box',
    },
  }, h(VoiceInput, {
    sessionId: FIXED_SESSION,
    inputActions,
    locked,
    onActiveChange: setExpanded,
    createRecording,
    transcribe,
    openSettings,
    prepare,
    cancelPreparation,
    configure,
    selectMicrophone,
    useSpeechReadiness,
    useMicrophoneDevice,
    usePluginNavigation,
    t,
  }))),
    badge,
  ])), document.body)
}
