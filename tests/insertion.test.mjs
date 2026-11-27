/**
 * A transcript is appended, and a vanished target must not swallow it.
 */
import assert from 'node:assert/strict'

class FieldStub {
  constructor(value) {
    this._value = value
    this.isConnected = true
    this.type = 'text'
    this.disabled = false
    this.readOnly = false
    this.selectionStart = 0
    this.selectionEnd = 0
    this.events = []
  }

  get value() { return this._value }
  set value(next) { this._value = next }
  closest() { return null }
  focus() {}
  setSelectionRange() {}
  getBoundingClientRect() { return { width: 200, height: 24, top: 0, left: 0, right: 200, bottom: 24 } }
  getClientRects() { return [{}] }
  dispatchEvent(event) { this.events.push(event.type); return true }
}

class EditableStub extends FieldStub {
  constructor() { super(''); this.isContentEditable = true }
}

globalThis.HTMLElement = FieldStub
globalThis.HTMLInputElement = FieldStub
globalThis.HTMLTextAreaElement = class extends FieldStub {}
globalThis.Element = FieldStub
globalThis.document = { activeElement: null, querySelector: () => null, querySelectorAll: () => [] }

const { insertTranscript } = await import('../src/insertion.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

// 1. The captured field still exists: append there.
const field = new FieldStub('hello')
assert.equal(insertTranscript('world', { element: field, kind: 'field' }), true)
assert.equal(field.value, 'hello world')
ok('a live captured field receives the transcript, appended')

// 2. It vanished: the focused field takes it instead.
const captured = new FieldStub('old')
captured.isConnected = false
const focused = new FieldStub('draft')
document.activeElement = focused
assert.equal(insertTranscript('again', { element: captured, kind: 'field' }), true)
assert.equal(focused.value, 'draft again')
ok('a vanished target falls back to the focused field')

// 3. Nothing can take it: report failure so the caller keeps it pending.
document.activeElement = null
assert.equal(insertTranscript('orphan', null), false)
ok('with no target at all the transcript is reported as uninserted')

console.log('\n3 assertions passed')
