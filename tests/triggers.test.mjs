/**
 * Trigger parsing and matching: what the configuration may say, and which
 * event it answers.
 */
import assert from 'node:assert/strict'

globalThis.window = { addEventListener: () => {}, removeEventListener: () => {} }

const { expressionOf, matchesKey, matchesMouse, parseTriggers } = await import('../src/trigger/expression.ts')
const { startTriggers } = await import('../src/trigger/engine.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const key = (code, modifiers = {}) => ({
  kind: 'key', code, ctrl: false, alt: false, shift: false, meta: false, ...modifiers,
})

assert.deepEqual(parseTriggers(['Ctrl+Shift+Space']), [key('Space', { ctrl: true, shift: true })])
assert.deepEqual(parseTriggers(['Ctrl+/']), [key('Slash', { ctrl: true })])
assert.deepEqual(parseTriggers(['F9']), [key('F9')])
assert.deepEqual(parseTriggers(['Mouse:Back']), [{ kind: 'mouse', button: 3 }])
assert.deepEqual(parseTriggers(['Mouse:Forward']), [{ kind: 'mouse', button: 4 }])
assert.deepEqual(parseTriggers(['MediaPlayPause']), [key('MediaPlayPause')])
ok('expressions parse into triggers')

assert.deepEqual(parseTriggers(['A', 'Ctrl+Nope', '', 'Ctrl+Shift+,']), [key('Comma', { ctrl: true, shift: true })])
ok('a bare letter and an unknown key are dropped, not guessed at')

const ctrlShiftSpace = { code: 'Space', key: ' ', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false }
const ctrlSpace = { code: 'Space', key: ' ', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false }
assert.equal(matchesKey(key('Space', { ctrl: true, shift: true }), ctrlShiftSpace), true)
assert.equal(matchesKey(key('Space', { ctrl: true, shift: true }), ctrlSpace), false)
ok('a key trigger requires the exact modifier set')

assert.equal(matchesMouse({ kind: 'mouse', button: 3 }, { button: 3 }), true)
assert.equal(matchesMouse({ kind: 'mouse', button: 3 }, { button: 0 }), false)
ok('a mouse trigger matches its own button only')

assert.equal(expressionOf({ code: 'Space', key: ' ', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false }), 'Ctrl+Shift+Space')
assert.equal(expressionOf({ code: 'KeyV', key: 'v', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false }), 'Ctrl+V')
assert.equal(expressionOf({ code: 'ShiftLeft', key: 'Shift', ctrlKey: false, shiftKey: true, altKey: false, metaKey: false }), null)
assert.equal(expressionOf({ button: 3 }), 'Mouse:Back')
assert.equal(expressionOf({ button: 4 }), 'Mouse:Forward')
assert.equal(expressionOf({ button: 0 }), null)
ok('a captured event describes itself, and a bare modifier describes nothing')

// Whatever is captured must parse back, or it could never fire.
const roundTrip = [
  { code: 'Comma', key: '<', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false },
  { code: 'Slash', key: '?', ctrlKey: true, shiftKey: true, altKey: false, metaKey: false },
  { code: 'BracketLeft', key: '{', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false },
  { code: 'Escape', key: 'Escape', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false },
  { code: 'NumpadAdd', key: '+', ctrlKey: true, altKey: false, shiftKey: false, metaKey: false },
]
for (const event of roundTrip) {
  const expression = expressionOf(event)
  assert.ok(expression !== null, `captured ${event.code}`)
  assert.ok(parseTriggers([expression]).length === 1, `parsed back ${expression}`)
}
ok('every capturable combination parses back into a working trigger')

// AltGraph types a character; it must not match a ctrl+alt shortcut.
const altGraph = new Map()
globalThis.window.addEventListener = (type, handler) => altGraph.set(type, handler)
let altFired = 0
const stopAlt = startTriggers([{ triggers: () => parseTriggers(['Ctrl+Alt+KeyE']), fire: () => { altFired += 1 } }])
altGraph.get('keydown')({
  code: 'KeyE', key: '€', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false,
  repeat: false, isComposing: false, preventDefault: () => {}, stopPropagation: () => {},
  getModifierState: state => state === 'AltGraph',
})
assert.equal(altFired, 0)
stopAlt()
ok('AltGr input does not fire a ctrl+alt trigger')

const listeners = new Map()
const removed = []
globalThis.window.addEventListener = (type, handler) => listeners.set(type, handler)
globalThis.window.removeEventListener = type => removed.push(type)
let fired = 0
const dispose = startTriggers([{ triggers: () => parseTriggers(['Ctrl+Shift+Space', 'Mouse:Back']), fire: () => { fired += 1 } }])
let prevented = false
listeners.get('keydown')({ ...ctrlShiftSpace, repeat: false, isComposing: false, preventDefault: () => { prevented = true }, stopPropagation: () => {} })
assert.equal(fired, 1)
assert.equal(prevented, true)
listeners.get('keydown')({ ...ctrlSpace, repeat: false, isComposing: false, preventDefault: () => {}, stopPropagation: () => {} })
assert.equal(fired, 1)
listeners.get('mousedown')({ button: 3, preventDefault: () => {}, stopPropagation: () => {} })
assert.equal(fired, 2)
dispose()
assert.deepEqual(removed.sort(), ['auxclick', 'keydown', 'mousedown'])
ok('the engine fires only on its own triggers and removes every listener')

// Two bindings share one listener pair, and a match belongs to exactly one.
const groups = new Map()
globalThis.window.addEventListener = (type, handler) => groups.set(type, handler)
const hits = []
const stopGroups = startTriggers([
  { triggers: () => parseTriggers(['Ctrl+Shift+Space']), fire: () => { hits.push('voice') } },
  { triggers: () => parseTriggers(['Ctrl+Alt+S']), fire: () => { hits.push('submit') } },
])
groups.get('keydown')({ code: 'KeyS', key: 's', ctrlKey: true, altKey: true, shiftKey: false, metaKey: false, repeat: false, isComposing: false, preventDefault: () => {}, stopPropagation: () => {} })
groups.get('keydown')({ ...ctrlShiftSpace, repeat: false, isComposing: false, preventDefault: () => {}, stopPropagation: () => {} })
assert.deepEqual(hits, ['submit', 'voice'])
stopGroups()
ok('independent bindings fire their own actions, never each other\'s')

console.log(`\n${passed} assertions passed`)
