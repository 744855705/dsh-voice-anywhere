/**
 * The control's state: which editable it serves, where it sits, and whether the
 * capture row is open.
 *
 * Kept out of the component so the rendering file stays a description of the
 * portal, and so this state machine can be reasoned about (and later tested)
 * without a renderer.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { hasForeignRecording } from '../controls.ts'
import { note } from '../diagnostics.ts'
import { dockProbe, placementFor, type Placement } from '../placement.ts'
import { findSurface } from '../surfaces.ts'
import type { EditableKind } from '../targets.ts'

/** How often the surface is re-resolved when no event fires. */
const SYNC_MS = 300

/** The editable a transcript belongs to. */
export interface ControlTarget {
  readonly element: HTMLElement
  readonly kind: EditableKind
}

/** Everything the view needs to draw one control. */
export interface SurfaceControl {
  readonly target: ControlTarget | null
  readonly box: Placement | null
  readonly expanded: boolean
  readonly mode: 'dock' | 'field'
  readonly locked: boolean
  readonly setExpanded: (next: boolean) => void
  readonly rootRef: { current: HTMLDivElement | null }
}

/**
 * Track the surface the control belongs to.
 * @param refreshReadiness - speech readiness refresh, run once on mount.
 * @returns the state the view renders from.
 */
export function useSurfaceControl(refreshReadiness: () => void): SurfaceControl {
  const [target, setTarget] = useState<ControlTarget | null>(null)
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
      let next: ControlTarget | null = null
      let placement: Placement | null = null
      let resolvedMode: 'dock' | 'field' = 'field'

      if (surface !== null) {
        next = { element: surface.field, kind: surface.fieldKind }
        const resolved = placementFor(surface, expandedRef.current)
        placement = resolved?.box ?? null
        resolvedMode = resolved?.mode ?? 'field'
        if (surface.host !== null) {
          note({ dock: { kind: surface.kind, focused: surface.focused, ...(dockProbe(surface.host) as object) } })
        }
        note({
          last: {
            expanded: expandedRef.current,
            kind: surface.kind,
            focused: surface.focused,
            box: placement === null ? null : { left: Math.round(placement.left), top: Math.round(placement.top), width: Math.round(placement.width) },
          },
        })
      }

      // A field that vanished takes the control with it — except while a capture
      // is running: unmounting then would cancel the recording in progress.
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
    refreshReadiness()
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

  // A field the row takes over has its own text hidden underneath it, so the
  // controls are not drawn on top of a placeholder.
  useEffect(() => {
    const element = target?.element ?? null
    if (element === null) return undefined
    if (expanded && mode === 'field') element.setAttribute('data-voice-anywhere-capturing', '')
    else element.removeAttribute('data-voice-anywhere-capturing')
    return () => { element.removeAttribute('data-voice-anywhere-capturing') }
  }, [target, expanded, mode])

  // The capture row is a different shape from the idle button; measuring in a
  // layout effect keeps it from painting once at the idle width before the next
  // sweep moves it.
  useLayoutEffect(() => {
    syncRef.current()
  }, [expanded])

  return { target, box, expanded, mode, locked, setExpanded, rootRef }
}
