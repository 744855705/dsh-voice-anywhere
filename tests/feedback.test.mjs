/**
 * The finished-capture state must be dismissible from the keyboard.
 *
 * In that state the official component has replaced the composer with a single
 * feedback row, which takes every shortcut down with it; the plugin's press is
 * the only way back, so these tests pin the branch order and the target.
 */
import assert from 'node:assert/strict'

let clicks = []

class ButtonStub {
  constructor(label) { this.label = label }
  click() { clicks.push(this.label) }
}

class ContainerStub {
  constructor(phase) {
    this.phase = phase
    // The activity row carries the same buttons the container does; the plugin
    // presses the row when there is one.
    this.row = {
      getAttribute: () => phase,
      querySelectorAll: () => this.buttons(),
    }
  }

  buttons() {
    // A finished capture leads with cancel and ends with stop.
    return [new ButtonStub(`${this.phase}:cancel`), new ButtonStub(`${this.phase}:last`)]
  }

  querySelector(selector) {
    if (String(selector).includes('data-voice-activity')) return this.row
    return null
  }

  querySelectorAll(selector) {
    return String(selector).includes('button') ? this.buttons() : []
  }

  contains() { return true }
}

class ElementStub {
  constructor(tag = 'DIV') { this.tagName = tag }
  closest() { return null }
  getBoundingClientRect() { return { width: 200, height: 24, top: 0, left: 0, right: 200, bottom: 24 } }
  getClientRects() { return [{}] }
  focus() {}
}

globalThis.Element = ElementStub
globalThis.HTMLElement = ElementStub
globalThis.HTMLInputElement = class extends ElementStub {}
globalThis.HTMLTextAreaElement = class extends ElementStub {}

const FLOATING = ContainerStub.prototype
const floating = new ContainerStub('feedback')
const composer = new ContainerStub('feedback')

globalThis.document = {
  activeElement: null,
  querySelector: selector => {
    const value = String(selector)
    if (value.includes('data-voice-anywhere-root')) return floating
    if (value.includes('data-composer-card')) return composer
    return null
  },
  querySelectorAll: () => [],
}

const { planActivation } = await import('../src/activate.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

// 1. Composer feedback: the press dismisses it, whatever holds focus.
globalThis.document.activeElement = null
clicks = []
const composerAction = planActivation()
assert.notEqual(composerAction, null)
composerAction()
assert.deepEqual(clicks, ['feedback:last'])
ok('a composer feedback row presses its trailing action')

// 2. Floating feedback: same row, different instance.
globalThis.document.querySelector = selector => (String(selector).includes('data-voice-anywhere-root') ? floating : null)
clicks = []
const floatingAction = planActivation()
assert.notEqual(floatingAction, null)
floatingAction()
assert.deepEqual(clicks, ['feedback:last'])
ok('a floating feedback row presses its trailing action')

// 3. A running capture outranks a finished one on the other instance.
const recording = new ContainerStub('recording')
globalThis.document.querySelector = selector => (String(selector).includes('data-voice-anywhere-root') ? recording : composer)
clicks = []
const mixed = planActivation()
assert.notEqual(mixed, null)
mixed()
assert.equal(clicks.length, 1)
assert.equal(clicks[0], 'recording:last')
ok('recording wins over a pending feedback row')

console.log(`\n${passed} assertions passed`)
