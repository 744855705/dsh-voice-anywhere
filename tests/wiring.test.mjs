/**
 * Composition and press-semantics tests for the built artifact.
 *
 * Evaluates `client.js` against a stub module table and a stub Cordis context:
 * the artifact must load, `apply` must not throw, it must register the overlay
 * entry and one unbound command, and that command's `resolve` must drive the
 * same button a click would — including stopping a capture whose field no
 * longer has focus.
 */
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const artifact = join(here, '..', 'client.js')

let loaded
const stubs = {
  'react': new Proxy({
    createElement: (type, props) => ({ type, props }),
    useState: initial => [initial, () => {}],
    useRef: initial => ({ current: initial }),
    useEffect: () => {},
    useLayoutEffect: () => {},
    // The vendored control is wrapped in an error boundary, which extends this.
    Component: class { constructor(props) { this.props = props; this.state = {} } setState() {} },
  }, { get: (target, key) => key in target ? target[key] : () => {} }),
  'react/jsx-runtime': { jsx: () => null, jsxs: () => null, Fragment: '#fragment' },
  'react-dom': { createPortal: node => node },
  '@deepseek-ai/dsh-client-store': {
    createSnapshotStore: initial => ({
      getSnapshot: () => initial,
      subscribe: () => () => {},
      set: () => {},
      update: () => {},
    }),
  },
  '@deepseek-ai/dsh-client-ui-primitives': new Proxy({}, { get: () => () => null }),
}

let removedStyles = 0
globalThis.window = {
  __ModuleLoader__: { load: descriptor => { loaded = descriptor } },
  addEventListener: () => {},
  removeEventListener: () => {},
  setInterval: () => 0,
  clearInterval: () => {},
  innerWidth: 1200,
  innerHeight: 800,
}
globalThis.document = {
  createElement: () => ({ setAttribute: () => {}, remove: () => { removedStyles += 1 }, style: {}, textContent: '' }),
  head: { appendChild: () => {} },
  body: {},
  addEventListener: () => {},
  removeEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  activeElement: null,
}
Object.defineProperty(globalThis, 'navigator', { value: {}, configurable: true })
globalThis.localStorage = { getItem: () => null, setItem: () => {} }
globalThis.fetch = async () => ({ ok: true, json: async () => ({ allow: [], disable: [], triggers: [], settingsPage: true, revision: 'r1', profile: 'web' }) })
class ElementStub {
  closest() { return null }
  getBoundingClientRect() { return { width: 200, height: 24, top: 0, left: 0, right: 200, bottom: 24 } }
  getClientRects() { return [{}] }
  focus() {}
}
globalThis.Element = ElementStub
globalThis.HTMLElement = class extends ElementStub {}
globalThis.HTMLInputElement = class extends globalThis.HTMLElement {
  constructor() { super(); this.type = 'text'; this.disabled = false; this.readOnly = false }
}
globalThis.HTMLTextAreaElement = class extends globalThis.HTMLElement {
  constructor() { super(); this.disabled = false; this.readOnly = false }
}
globalThis.Node = class {}
globalThis.Event = class {}
globalThis.requestAnimationFrame = callback => { callback(); return 0 }

globalThis.__VA_DEBUG = true
await import(pathToFileURL(artifact).href)

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

assert.equal(loaded.id, 'dsh-voice-anywhere')
ok('artifact registers the loader id')

const plugin = loaded.factory(spec => {
  if (!(spec in stubs)) throw new Error(`unexpected require(${spec})`)
  return stubs[spec]
})
assert.equal(typeof plugin.apply, 'function')
assert.deepEqual([...plugin.inject], ['slots', 'locale', 'shortcuts'])
ok('factory returns the plugin face')

const calls = { slots: [], shortcuts: [], effects: 0, disposers: [] }
const ctx = {
  effect(fn) {
    calls.effects += 1
    calls.disposers.push(fn())
    return () => {}
  },
  locale: { bind: ns => key => `${ns}:${key}`, register: () => () => {} },
  get: () => undefined,
  inject: () => () => {},
  slots: {
    inject: (key, callback) => callback(),
    register: (options, component) => { calls.slots.push({ options, component }); return () => {} },
  },
  shortcuts: {
    register: command => { calls.shortcuts.push(command); return () => {} },
  },
}

plugin.apply(ctx)
ok('apply completes without throwing')

assert.equal(calls.slots.length, 1)
const slot = calls.slots[0]
assert.equal(slot.options.name, 'shell.overlay')
assert.equal(slot.options.id, 'voice-anywhere.button')
assert.equal(slot.options.locale, 'voice-anywhere')
assert.equal(typeof slot.component, 'function')
ok('registers the floating microphone in shell.overlay')

assert.equal(calls.shortcuts.length, 1)
const command = calls.shortcuts[0]
assert.equal(command.id, 'voice.anywhere.toggle')
assert.deepEqual([...command.regions], ['page', 'editable'])
assert.ok(command.modals.includes('other') && command.modals.includes('sidebar'))
assert.deepEqual(command.defaults, {}, 'the command must stay unbound')
assert.equal(typeof command.label(), 'string')
ok('registers one unbound shortcut with dialog access')

assert.equal(typeof globalThis.window.__voiceAnywhere.build.official, 'string')
assert.ok(Array.isArray(globalThis.window.__voiceAnywhere.events))
ok('publishes build metadata and the diagnostic ring')

/**
 * Fake microphone container.
 * @param phase - 'idle' (no capture row) or a `data-voice-activity` phase.
 * @param onClick - records which button was pressed.
 */
function container(phase, onClick) {
  const trigger = { click: () => onClick('trigger') }
  const cancel = { click: () => onClick('cancel') }
  const stop = { click: () => onClick('stop') }
  const buttons = phase === 'idle' ? [trigger] : [cancel, stop]
  const row = phase === 'idle'
    ? null
    : { getAttribute: () => phase, querySelectorAll: () => buttons }
  return {
    contains: () => true,
    querySelector: selector => selector === '[data-voice-activity]' ? row : (selector === 'button' ? trigger : null),
    querySelectorAll: () => buttons,
  }
}

class ComposerTarget extends globalThis.Element {
  closest(selector) { return selector === '[data-composer-card]' ? {} : null }
}
class FieldTarget extends globalThis.Element {
  closest() { return null }
}
const inComposer = new ComposerTarget()
const inField = new FieldTarget()

function route({ composer = null, floating = null, dialogs = [], questions = [] }) {
  globalThis.document.querySelector = selector => {
    const value = String(selector)
    if (value.includes('data-composer-card')) return composer
    if (value.includes('data-voice-anywhere-root')) return floating
    return null
  }
  globalThis.document.querySelectorAll = selector => {
    const value = String(selector)
    // The resolver asks for every dock host in one selector; this harness keeps
    // the two lists apart and answers with the one the case populated.
    if (value.includes('role="dialog"') && value.includes('data-question-key')) {
      return dialogs.length > 0 ? dialogs : questions
    }
    if (value.includes('role="dialog"')) return dialogs
    if (value.includes('data-question-key')) return questions
    return []
  }
}

// Composer focused, idle: the key presses the official trigger.
let pressed = []
route({ composer: container('idle', name => pressed.push(name)) })
let resolution = command.resolve({ target: inComposer })
assert.equal(resolution.status, 'handled')
resolution.run()
assert.deepEqual(pressed, ['trigger'])
ok('composer idle: press starts the official capture')

// Recording in the composer while the caret moved elsewhere: the key stops it.
pressed = []
route({ composer: container('recording', name => pressed.push(name)) })
resolution = command.resolve({ target: inField })
assert.equal(resolution.status, 'handled')
resolution.run()
assert.deepEqual(pressed, ['stop'])
ok('composer recording: press stops it from outside the composer')

// A capture in progress that accepts no press leaves the key alone.
route({ composer: container('transcribing', () => {}) })
assert.equal(command.resolve({ target: inComposer }).status, 'pass')
ok('composer busy: the key is passed through')

// Floating idle: the key presses our own instance.
pressed = []
route({ floating: container('idle', name => pressed.push(name)) })
resolution = command.resolve({ target: inField })
assert.equal(resolution.status, 'handled')
resolution.run()
assert.deepEqual(pressed, ['trigger'])
ok('floating idle: press starts the field capture')

// Floating recording: the key stops it even though focus moved away.
pressed = []
route({ floating: container('recording', name => pressed.push(name)) })
resolution = command.resolve({ target: inField })
assert.equal(resolution.status, 'handled')
resolution.run()
assert.deepEqual(pressed, ['stop'])
ok('floating recording: press stops it')

// Focus on the page with the composer available: the key falls back to the
// official composer microphone instead of doing nothing.
pressed = []
route({ composer: container('idle', name => pressed.push(name)) })
resolution = command.resolve({ target: inField })
assert.equal(resolution.status, 'handled')
resolution.run()
assert.deepEqual(pressed, ['trigger'])
ok('page focus: press falls back to the composer microphone')

// A floating capture still transcribing must not be shadowed by the fallback.
route({ floating: container('transcribing', () => { throw new Error('pressed a busy entry') }), composer: container('idle', () => { throw new Error('shadowed the floating entry') }) })
assert.equal(command.resolve({ target: inField }).status, 'pass')
ok('floating busy: the composer fallback stays out of the way')

// A dialog with a text field, but focus on one of its buttons: the key moves
// focus into the field and presses the control that focus brings up.
pressed = []
let focused = null
const dialogFieldElement = new globalThis.HTMLTextAreaElement()
const dialogRoot = {
  matches: selector => String(selector).includes('role="dialog"'),
  querySelectorAll: () => [dialogFieldElement],
}
dialogFieldElement.focus = () => {
  focused = dialogFieldElement
  route({ floating: container('idle', name => pressed.push(name)) })
}
route({ dialogs: [dialogRoot] })
resolution = command.resolve({ target: new globalThis.HTMLElement() })
assert.equal(resolution.status, 'handled')
resolution.run()
assert.equal(focused, dialogFieldElement)
assert.deepEqual(pressed, ['trigger'])
ok('dialog focus elsewhere: press dictates into the dialog field')

// A question card replaces the composer inline and keeps no focus on its
// answer field once a choice is clicked: the key must still reach that field.
pressed = []
focused = null
const answerField = new globalThis.HTMLTextAreaElement()
const questionCard = {
  matches: selector => String(selector).includes('data-question-key'),
  querySelectorAll: () => [answerField],
}
answerField.focus = () => {
  focused = answerField
  route({ floating: container('idle', name => pressed.push(name)) })
}
route({ questions: [questionCard] })
resolution = command.resolve({ target: new globalThis.HTMLElement() })
assert.equal(resolution.status, 'handled')
resolution.run()
assert.equal(focused, answerField)
assert.deepEqual(pressed, ['trigger'])
ok('question card: press dictates into the answer field')

// No microphone anywhere: the key belongs to someone else.
route({})
assert.equal(command.resolve({ target: inField }).status, 'pass')
ok('no microphone rendered: the key is passed through')

// The configuration turned the settings page on: it must reach `settings.section`
// through injection, which is how the declaring plugin is waited for.
await new Promise(resolve => setTimeout(resolve, 0))
const section = calls.slots.find(entry => entry.options.name === 'settings.section')
assert.equal(section.options.id, 'voice-anywhere')
assert.equal(typeof section.component, 'function')
ok('settings page registers through the declared settings slot')

// Unloading must release everything the plugin registered.
for (const dispose of calls.disposers) {
  if (typeof dispose === 'function') dispose()
}
assert.equal(removedStyles, 1)
ok('disposal removes the injected stylesheet')

console.log(`\n${passed} assertions passed`)
