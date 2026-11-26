/**
 * Geometry tests for the per-surface placements.
 *
 * Both docked surfaces anchor on the rightmost cluster of the action row, so
 * the numbers below are the contract: the question card's pager bounds the left
 * side, a dialog's own inset does, and a surface without an action row falls
 * back to the field's edge.
 */
import assert from 'node:assert/strict'

globalThis.window = { innerWidth: 1219, innerHeight: 800 }
globalThis.HTMLElement = class {}

const { dockBox, fieldBox, placementFor } = await import('../src/placement.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const box = (left, top, width, height) => ({ left, top, width, height, right: left + width, bottom: top + height })

/** Minimal element stand-in: rect, children and a flat button list. */
function node(rect, { children = [], buttons = [], kind = 'div' } = {}) {
  const element = new globalThis.HTMLElement()
  Object.assign(element, {
    kind,
    children,
    getBoundingClientRect: () => rect,
    querySelectorAll: selector => (selector === 'button' ? buttons : []),
    matches: () => kind !== 'div',
  })
  for (const child of children) child.parentElement = element
  return element
}

// A question card: pager chevrons at the left of the footer, actions at the
// right. The chevrons are real buttons on the same row, which is exactly what
// used to drag the control to the far left.
const previousPage = node(box(36, 353, 24, 30), { kind: 'button' })
const nextPage = node(box(66, 353, 24, 30), { kind: 'button' })
const pager = node(box(32, 353, 68, 30), { children: [previousPage, nextPage] })
const feedback = node(box(108, 353, 952, 30))
const skip = node(box(1068, 353, 56, 30), { kind: 'button' })
const submit = node(box(1136, 353, 60, 30), { kind: 'button' })
const actions = node(box(1068, 353, 128, 30), { children: [skip, submit] })
const footer = node(box(24, 353, 1171, 30), { children: [pager, feedback, actions] })

const card = node(box(24, 0, 1171, 400), { children: [footer], buttons: [previousPage, nextPage, skip, submit] })

const cardRow = dockBox(card, true)
assert.equal(cardRow.left, 108)
assert.equal(cardRow.width, 952)
assert.equal(cardRow.top, 368)
ok('question card: the row starts after the pager and ends before the actions')

const cardButton = dockBox(card, false)
assert.equal(cardButton.left, 1030)
assert.equal(cardButton.width, 30)
assert.equal(cardButton.top, 368)
ok('question card: the idle mic sits where the stop button will be, centred on its band')

// A rename dialog: no pager, so the dialog's own inset bounds the left side.
const cancel = node(box(400, 250, 56, 30), { kind: 'button' })
const rename = node(box(468, 250, 56, 30), { kind: 'button' })
const dialogFooter = node(box(376, 250, 148, 30), { children: [cancel, rename] })
const content = node(box(124, 120, 400, 40))
const dialog = node(box(100, 50, 520, 250), { children: [content, dialogFooter], buttons: [cancel, rename] })

const dialogRow = dockBox(dialog, true)
assert.equal(dialogRow.left, 108)
assert.equal(dialogRow.width, 284)
assert.equal(dialogRow.top, 265)
ok('dialog: the row fills from the dialog inset to the action buttons')

// A dialog with header buttons above the footer: the lowest row wins.
const closeButton = node(box(560, 60, 24, 24), { kind: 'button' })
const helpButton = node(box(590, 60, 24, 24), { kind: 'button' })
const header = node(box(100, 50, 520, 40), { children: [closeButton, helpButton] })
const footedDialog = node(box(100, 50, 520, 250), {
  children: [header, content, dialogFooter],
  buttons: [closeButton, helpButton, cancel, rename],
})
const footedRow = dockBox(footedDialog, true)
assert.equal(footedRow.top, 265)
assert.equal(footedRow.width, 284)
ok('header buttons above the action row do not capture the dock')

// The shortcut reference: no action row, so nothing docks.
const search = node(box(80, 60, 500, 32))
const reference = node(box(0, 0, 1219, 768), { children: [search], buttons: [] })
assert.equal(dockBox(reference, true), null)
ok('a dialog without an action row does not dock')

assert.deepEqual(placementFor({ kind: 'dialog', focused: true, host: reference, field: search, fieldKind: 'field' }, false)?.box, fieldBox(search, false))
ok('a dialog without an action row falls back to the field edge')

assert.deepEqual(placementFor({ kind: 'plain', focused: true, host: null, field: search, fieldKind: 'field' }, false)?.box, fieldBox(search, false))
ok('a plain field keeps the default scheme')

const hidden = placementFor({ kind: 'question-card', focused: false, host: reference, field: search, fieldKind: 'field' }, false)
assert.equal(placementFor({ kind: 'plain', focused: true, host: null, field: search, fieldKind: 'field' }, true)?.mode, 'field')
assert.equal(placementFor({ kind: 'question-card', focused: true, host: card, field: search, fieldKind: 'field' }, true)?.mode, 'dock')
assert.equal(hidden, null)
ok('without focus a surface that cannot dock stays hidden')

const field = node(box(100, 100, 200, 24))
assert.deepEqual(fieldBox(field, false), { left: 266, top: 112, width: 30 })
assert.deepEqual(fieldBox(field, true), { left: 100, top: 112, width: 200 })
ok('a lone field keeps the idle button at its edge and hands the row its own width')

// A list whose rows are single buttons must never become an action row.
const rowButton = node(box(24, 500, 552, 40), { kind: 'button' })
const listDialog = node(box(0, 0, 1219, 768), { children: [search, rowButton], buttons: [rowButton] })
assert.equal(dockBox(listDialog, false), null)
ok('a list row with a single button does not dock the control')

// An action row with almost no free space to its left cannot host the row.
const crampedCancel = node(box(380, 250, 56, 30), { kind: 'button' })
const crampedRename = node(box(448, 250, 56, 30), { kind: 'button' })
const crampedFooter = node(box(356, 250, 148, 30), { children: [crampedCancel, crampedRename] })
const crampedDialog = node(box(300, 50, 200, 250), { children: [crampedFooter], buttons: [crampedCancel, crampedRename] })
assert.equal(dockBox(crampedDialog, true), null)
ok('a row with less than the minimum free width falls back instead of shrinking to nothing')

// A field near the right edge clamps the row inside the viewport.
const edgeField = node(box(1100, 100, 400, 24))
assert.equal(fieldBox(edgeField, true).left, 1219 - 400 - 8)
ok('a field wider than the space left stays inside the viewport')

console.log(`\n${passed} assertions passed`)
