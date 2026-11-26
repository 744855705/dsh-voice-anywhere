/**
 * Where the control sits — one implementation per surface.
 *
 * The host decides what "here" means, so a change for one surface cannot move
 * the control on another:
 * - question card and dialogs with an action row: dock in that row, anchored on
 *   the rightmost cluster of action buttons and bounded on the left by whatever
 *   the row already shows (the question pager) or the row's own inset;
 * - dialogs without an action row (the shortcut reference) and lone fields:
 *   follow the field itself.
 *
 * Anchoring on the buttons rather than the field is deliberate: a multi-line
 * field grows as you type, and the row must not move with it.
 */
import type { Surface } from './surfaces.ts'

const BUTTON_SIZE = 30
const ACTION_GAP = 8
const MIN_ROW_WIDTH = 120
/** Buttons within this vertical distance belong to one visual row. */
const CELL_TOLERANCE = 6
/** Buttons closer than this horizontally belong to one cluster. */
const CLUSTER_GAP = 24
/** An action row has at least this many buttons. */
const MIN_ACTION_BUTTONS = 2

/** Viewport box of the control. */
export interface Placement {
  readonly left: number
  readonly top: number
  readonly width: number
}

/** One action row's rightmost cluster. */
interface ActionCluster {
  readonly left: number
  readonly top: number
  readonly height: number
  readonly parent: HTMLElement
}

/**
 * Group the host's visible buttons into rows and return the rightmost cluster
 * of its lowest row. The question pager's chevrons sit far from the footer
 * actions, so the cluster split keeps them out automatically.
 * @param host - question card or dialog.
 * @returns the cluster, or null when the host has no action row.
 */
function actionCluster(host: HTMLElement): ActionCluster | null {
  const items = [...host.querySelectorAll('button')]
    .map(element => ({ element, rect: element.getBoundingClientRect() }))
    .filter(item => item.rect.width > 0 && item.rect.height > 0)
  if (items.length === 0) return null
  const rows: Array<{ top: number; items: typeof items }> = []
  for (const item of [...items].sort((left, right) => left.rect.top - right.rect.top)) {
    const row = rows.find(candidate => Math.abs(candidate.top - item.rect.top) <= CELL_TOLERANCE)
    if (row !== undefined) row.items.push(item)
    else rows.push({ top: item.rect.top, items: [item] })
  }
  const lowest = rows[rows.length - 1]
  const clusters: Array<typeof items> = []
  for (const item of [...lowest.items].sort((left, right) => left.rect.left - right.rect.left)) {
    const current = clusters[clusters.length - 1]
    const last = current?.[current.length - 1]
    if (current !== undefined && last !== undefined && item.rect.left - last.rect.right <= CLUSTER_GAP) current.push(item)
    else clusters.push([item])
  }
  const cluster = clusters[clusters.length - 1]
  const first = cluster?.[0]
  const parent = first?.element.parentElement
  // A lone button is not an action row: the shortcut reference is a list whose
  // rows are buttons, and docking onto one of them would move the control into
  // the list.
  if (cluster === undefined || cluster.length < MIN_ACTION_BUTTONS || first === undefined || parent === null || parent === undefined) {
    return null
  }
  const top = Math.min(...cluster.map(item => item.rect.top))
  const bottom = Math.max(...cluster.map(item => item.rect.bottom))
  return { left: Math.min(...cluster.map(item => item.rect.left)), top, height: bottom - top, parent }
}

/**
 * Bound the docked row on the left by what the row already shows.
 * @param rowElement - the action cluster's grandparent row (holds the pager).
 * @param band - the action row's vertical band.
 * @param right - the row's right edge.
 * @returns the leftmost usable x.
 */
function leftBoundary(rowElement: HTMLElement, band: { top: number; bottom: number }, right: number): number {
  const rowRect = rowElement.getBoundingClientRect()
  let left = rowRect.left + ACTION_GAP
  for (const child of [...rowElement.children]) {
    if (!(child instanceof HTMLElement)) continue
    const rect = child.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0 || rect.right > right) continue
    // A child that spans most of the row is a layout spacer (the footer's status
    // region), not content the control should make way for.
    if (rect.width > rowRect.width * 0.5) continue
    if (rect.bottom < band.top - 10 || rect.top > band.bottom + 10) continue
    left = Math.max(left, rect.right + ACTION_GAP)
  }
  return left
}

/**
 * Dock the control into a host's action row.
 * @param host - question card or dialog.
 * @param expanded - whether the capture row is showing.
 * @returns the box, or null when the host has no usable action row.
 */
export function dockBox(host: HTMLElement, expanded: boolean): Placement | null {
  const cluster = actionCluster(host)
  if (cluster === null) return null
  const right = cluster.left - ACTION_GAP
  const rowElement = cluster.parent.parentElement ?? cluster.parent
  const left = leftBoundary(rowElement, { top: cluster.top, bottom: cluster.top + cluster.height }, right)
  // Report the band's centre: the control translates itself by half its own
  // height, so it stays centred whatever height the official row has.
  const top = cluster.top + cluster.height / 2
  if (expanded) {
    if (right - left < MIN_ROW_WIDTH) return null
    return { left, top, width: right - left }
  }
  return { left: right - BUTTON_SIZE, top, width: BUTTON_SIZE }
}

/**
 * Follow the field itself.
 * @param element - the focused editable.
 * @param expanded - whether the capture row is showing.
 * @returns the box, or null when the field has no usable geometry.
 */
export function fieldBox(element: HTMLElement, expanded: boolean): Placement | null {
  const rect = element.getBoundingClientRect()
  if (rect.width < 60 || rect.height < 16) return null
  if (!expanded) {
    return {
      left: Math.max(8, Math.min(rect.right - BUTTON_SIZE - 4, window.innerWidth - BUTTON_SIZE - 6)),
      top: rect.top + rect.height / 2,
      width: BUTTON_SIZE,
    }
  }
  // The row takes the field over: same left edge, same width, so it reads as the
  // field turning into a recorder instead of a bar floating over its text.
  const width = Math.max(160, Math.min(rect.width, window.innerWidth - 16))
  return {
    left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
    top: rect.top + rect.height / 2,
    width,
  }
}

/**
 * Resolve the placement for one surface.
 * @param surface - resolved surface.
 * @param expanded - whether the capture row is showing.
 * @returns the box and the scheme used, or null when nothing can be shown.
 */
/** Resolved placement plus the scheme that produced it. */
export interface Resolved {
  readonly box: Placement
  readonly mode: 'dock' | 'field'
}

export function placementFor(surface: Surface, expanded: boolean): Resolved | null {
  if (surface.kind === 'plain') {
    const box = fieldBox(surface.field, expanded)
    return box === null ? null : { box, mode: 'field' }
  }
  const docked = surface.host === null ? null : dockBox(surface.host, expanded)
  if (docked !== null) return { box: docked, mode: 'dock' }
  // A dialog without an action row (the shortcut reference) keeps the field
  // scheme; without focus there is nothing to anchor to, so it stays hidden.
  if (!surface.focused) return null
  const box = fieldBox(surface.field, expanded)
  return box === null ? null : { box, mode: 'field' }
}

/**
 * Report the numbers behind a dock decision, for diagnostics.
 * @param host - question card or dialog.
 * @returns cluster geometry and the resulting band.
 */
export function dockProbe(host: HTMLElement): unknown {
  const cluster = actionCluster(host)
  if (cluster === null) return { host: 'no-action-row' }
  const right = cluster.left - ACTION_GAP
  const rowElement = cluster.parent.parentElement ?? cluster.parent
  const left = leftBoundary(rowElement, { top: cluster.top, bottom: cluster.top + cluster.height }, right)
  return {
    actionLeft: Math.round(cluster.left),
    right: Math.round(right),
    left: Math.round(left),
    width: Math.round(right - left),
    band: Math.round(cluster.top),
    // Every child that can push the left edge right; the culprit shows up here.
    children: [...rowElement.children].map(child => ({
      right: Math.round(child.getBoundingClientRect().right),
      width: Math.round(child.getBoundingClientRect().width),
    })),
  }
}
