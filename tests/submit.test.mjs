/**
 * Submit: the trigger reproduces Enter on the field dictation just filled.
 */
import assert from 'node:assert/strict'

class ElementStub {
  constructor() { this.events = [] }
  closest() { return null }
  contains() { return false }
  getAttribute() { return null }
  querySelector() { return null }
  getBoundingClientRect() { return { width: 200, height: 24, top: 0, left: 0, right: 200, bottom: 24 } }
  getClientRects() { return [{}] }
  focus() {}
  dispatchEvent(event) { this.events.push(event.type); return true }
}
globalThis.HTMLElement = ElementStub
globalThis.HTMLInputElement = class extends ElementStub {}
globalThis.HTMLTextAreaElement = class extends ElementStub {}
globalThis.Element = ElementStub
globalThis.KeyboardEvent = class {
  constructor(type, init) { this.type = type; Object.assign(this, init) }
}
globalThis.document = { activeElement: null, querySelector: () => null, querySelectorAll: () => [] }

const { dispatchEnter, planSubmit, submitTarget } = await import('../src/submit.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const field = new globalThis.HTMLTextAreaElement()
field.disabled = false
field.readOnly = false

document.activeElement = field
assert.equal(submitTarget(), field)
const action = planSubmit()
assert.ok(action !== null)
action()
assert.deepEqual(field.events, ['keydown', 'keyup'])
ok('a focused field receives the full Enter sequence')

document.activeElement = null
assert.equal(submitTarget(), null)
assert.equal(planSubmit(), null)
ok('with no field and no surface there is nothing to submit')

// A capture in progress owns the keyboard.
document.querySelector = selector => (String(selector).includes('data-voice-anywhere-root') ? {
  querySelector: sel => (String(sel).includes('data-voice-activity') ? { getAttribute: () => 'recording' } : null),
} : null)
document.activeElement = field
assert.equal(planSubmit(), null)
ok('submitting while recording does nothing')

document.querySelector = () => null
const sent = []
const target = new globalThis.HTMLTextAreaElement()
target.dispatchEvent = event => { sent.push([event.type, event.key, event.bubbles]) }
dispatchEnter(target)
assert.deepEqual(sent, [['keydown', 'Enter', true], ['keyup', 'Enter', true]])
ok('the dispatched key is a bubbling Enter')

console.log(`\n${passed} assertions passed`)
