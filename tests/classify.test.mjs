/**
 * Decision tests for target classification.
 *
 * Run with Node's TypeScript stripping (`node tests/classify.test.mjs`), no DOM
 * library: the few element behaviours `classify` relies on are faked here, so a
 * regression in the "which element is ours" rules fails loudly.
 */
import assert from 'node:assert/strict'

class FakeElement {
  constructor(tag, selectors = []) {
    this.tagName = tag.toUpperCase()
    this.selectors = selectors
    this.parents = []
    this.width = 200
    this.height = 24
    this.connected = true
  }

  closest(selector) {
    const wanted = selector.split(',').map(part => part.trim())
    for (const candidate of [this, ...this.parents]) {
      if (candidate.selectors.some(own => wanted.includes(own))) return candidate
    }
    return null
  }

  getBoundingClientRect() {
    return { width: this.width, height: this.height, top: 0, left: 0, right: this.width, bottom: this.height }
  }

  getClientRects() {
    return this.connected ? [this.getBoundingClientRect()] : []
  }
}

class FakeHTMLElement extends FakeElement {}
class FakeInput extends FakeHTMLElement {
  constructor(type = 'text') {
    super('input')
    this.type = type
    this.disabled = false
    this.readOnly = false
  }
}
class FakeTextArea extends FakeHTMLElement {
  constructor() {
    super('textarea')
    this.disabled = false
    this.readOnly = false
  }
}

globalThis.HTMLElement = FakeHTMLElement
globalThis.HTMLInputElement = FakeInput
globalThis.HTMLTextAreaElement = FakeTextArea

const { classify } = await import('../src/targets.ts')

const COMPOSER = '[data-composer-card]'
const composer = new FakeElement('div', [COMPOSER])

function insideComposer(element) {
  element.parents.push(composer)
  return element
}

let passed = 0
function check(name, actual, expected) {
  assert.deepEqual(actual === null ? null : { kind: actual.kind }, expected === null ? null : { kind: expected })
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

check('text input outside the composer is ours', classify(new FakeInput('text')), 'field')
check('search input is ours', classify(new FakeInput('search')), 'field')
check('textarea is ours', classify(new FakeTextArea()), 'field')
check('password input is ignored', classify(new FakeInput('password')), null)
check('number input is ignored', classify(new FakeInput('number')), null)
check('file input is ignored', classify(new FakeInput('file')), null)
check('input inside the composer is ignored', classify(insideComposer(new FakeInput('text'))), null)

const disabled = new FakeInput('text')
disabled.disabled = true
check('disabled input is ignored', classify(disabled), null)

const readOnly = new FakeTextArea()
readOnly.readOnly = true
check('read-only textarea is ignored', classify(readOnly), null)

const tiny = new FakeTextArea()
tiny.width = 40
check('zero-width control (terminal/editor hidden textarea) is ignored', classify(tiny), null)

const editor = new FakeHTMLElement('div', ['[contenteditable="true"]'])
check('contenteditable root is ours', classify(editor), 'editor')

const child = new FakeHTMLElement('span')
child.parents.push(editor)
check('focus on a child span resolves to the editor root', classify(child), 'editor')

const composerEditor = insideComposer(new FakeHTMLElement('div', ['[contenteditable="true"]']))
check('contenteditable inside the composer is ignored', classify(composerEditor), null)

check('null target is ignored', classify(null), null)
check('plain object is ignored', classify({}), null)

console.log(`\n${passed} assertions passed`)
