/**
 * The floating microphone: the official component, placed next to the focused
 * field or docked into the footer of an open dialog.
 *
 * Nothing about the button, its capture row or its feedback is reimplemented.
 * This file only decides which editable a transcript belongs to, where the
 * control sits, and when it goes away.
 *
 * Two placements, one control:
 * - an editable on the page: the control follows that field's right edge;
 * - a dialog with a text field: the control docks in the dialog's footer, in
 *   the space left of the action buttons, and stretches across it. That keeps
 *   it visible from the moment the dialog opens (no focus required) and stops
 *   the capture row from being squeezed into a few hundred pixels next to a
 *   narrow field.
 */
import { createElement as h, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { VoiceInput } from 'voice-official/VoiceInput.tsx'
import { hasForeignRecording } from './controls.ts'
import { insertText, type EditableKind } from './targets.ts'
import { dockProbe, placementFor, type Placement } from './placement.ts'
import { findSurface } from './surfaces.ts'

/** The component only uses the id to reset its capture state. */
const FIXED_SESSION = 'voice-anywhere'
const SYNC_MS = 300

interface InsertionSpan {
  readonly element: HTMLElement
  readonly kind: EditableKind
}

/**
 * Copy as the last resort so a transcript is never lost when its field closed.
 * @param text - transcript.
 */
function copyToClipboard(text: string): void {
  void navigator.clipboard?.writeText(text).catch(() => undefined)
}

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
  const [target, setTarget] = useState<{ element: HTMLElement; kind: EditableKind } | null>(null)
  const [box, setBox] = useState<Placement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [locked, setLocked] = useState(false)
  const [mode, setMode] = useState<'dock' | 'field'>('field')
  const expandedRef = useRef(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const signature = useRef('')
  const syncRef = useRef<() => void>(() => {})
  const identity = useRef(new WeakMap<HTMLElement, number>())
  const identities = useRef(0)
  const identityOf = (element: HTMLElement): number => {
    const known = identity.current.get(element)
    if (known !== undefined) return known
    identities.current += 1
    identity.current.set(element, identities.current)
    return identities.current
  }
  expandedRef.current = expanded

  useEffect(() => {
    const sync = (): void => {
      const surface = findSurface()
      let next: { element: HTMLElement; kind: EditableKind } | null = null
      let placement: Placement | null = null
      let resolvedMode: 'dock' | 'field' = 'field'

      if (surface !== null) {
        next = { element: surface.field, kind: surface.fieldKind }
        const resolved = placementFor(surface, expandedRef.current)
        placement = resolved?.box ?? null
        resolvedMode = resolved?.mode ?? 'field'
        if (surface.host !== null) {
          // The host decides the placement; report its numbers for diagnostics.
          ;(window as any).__voiceAnywhere = {
            ...(window as any).__voiceAnywhere,
            dock: { kind: surface.kind, focused: surface.focused, ...(dockProbe(surface.host) as object) },
          }
        }
        ;(window as any).__voiceAnywhere = {
          ...(window as any).__voiceAnywhere,
          last: {
            expanded: expandedRef.current,
            kind: surface.kind,
            focused: surface.focused,
            box: placement === null ? null : { left: Math.round(placement.left), top: Math.round(placement.top), width: Math.round(placement.width) },
          },
        }
      }

      // A dialog field that vanished takes the control with it — except while a
      // capture is running: unmounting then would cancel the recording the user
      // is looking at.
      if (next !== null && !next.element.isConnected && !expandedRef.current) {
        next = null
        placement = null
      }
      if (expandedRef.current && (next === null || placement === null)) return

      // Element identity belongs in the signature: two fields with the same box
      // must still move the insertion target.
      const key = next === null || placement === null
        ? ''
        : `${resolvedMode}|${placement.left}|${placement.top}|${placement.width}|${identityOf(next.element)}`
      if (key !== signature.current) {
        signature.current = key
        setTarget(next)
        setBox(placement)
        setMode(resolvedMode)
      }
      setLocked(hasForeignRecording(rootRef.current))
    }

    syncRef.current = sync
    sync()
    void refreshReadiness()
    document.addEventListener('focusin', sync, true)
    document.addEventListener('focusout', sync, true)
    window.addEventListener('scroll', sync, true)
    window.addEventListener('resize', sync)
    // Dialogs appear and leave without a focus event; one cheap sweep keeps the
    // docked control visible from the first frame the dialog is on screen.
    const timer = window.setInterval(sync, SYNC_MS)
    return () => {
      document.removeEventListener('focusin', sync, true)
      document.removeEventListener('focusout', sync, true)
      window.removeEventListener('scroll', sync, true)
      window.removeEventListener('resize', sync)
      window.clearInterval(timer)
      syncRef.current = () => {}
    }
  }, [refreshReadiness])

  // A field that the row takes over has its own text hidden underneath it, so
  // the controls are not drawn on top of a placeholder.
  useEffect(() => {
    const element = target?.element ?? null
    if (element === null) return undefined
    const active = expanded && mode === 'field'
    if (active) element.setAttribute('data-voice-anywhere-capturing', '')
    else element.removeAttribute('data-voice-anywhere-capturing')
    return () => { element.removeAttribute('data-voice-anywhere-capturing') }
  }, [target, expanded, mode])

  // The capture row is a different shape from the idle button; measuring in a
  // layout effect keeps it from painting once at the idle width before the next
  // sweep moves it.
  useLayoutEffect(() => {
    syncRef.current()
  }, [expanded])

  if (target === null || box === null) return null

  const inputActions = {
    captureInsertion: (): InsertionSpan | null => target.element.isConnected
      ? { element: target.element, kind: target.kind }
      : null,
    insertText: (text: string, span: InsertionSpan | null): boolean => {
      // A live target takes the text; a vanished one reports failure so the
      // official component shows its conflict affordance instead of claiming a
      // success that only reached the clipboard. Its explicit retry carries no
      // span, and that is the branch allowed to fall back to the clipboard.
      if (span !== null) {
        return span.element.isConnected && insertText({ element: span.element, kind: span.kind }, text)
      }
      copyToClipboard(text)
      return true
    },
  }

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
  }))), document.body)
}
