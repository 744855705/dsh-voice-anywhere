/**
 * Insertion tests.
 *
 * The regression they lock down: dialogs open with their field fully selected,
 * and inserting at the caret then replaces the whole name. A transcript must be
 * appended, one utterance after another, the way the official composer does.
 */
import assert from 'node:assert/strict'

class FakeInput {
  constructor(value) {
    this._value = value
    this.isConnected = true
    this.selectionStart = 0
    this.selectionEnd = value.length
    this.events = []
  }

  get value() {
    return this._value
  }

  set value(next) {
    this._value = next
  }

  focus() {}

  setSelectionRange(start, end) {
    this.selectionStart = start
    this.selectionEnd = end
  }

  dispatchEvent(event) {
    this.events.push(event.type)
    return true
  }
}

globalThis.HTMLElement = class {}
class FakeTextArea extends FakeInput {}
// The real DOM declares `value` on each prototype, so mirror that here.
Object.defineProperty(FakeTextArea.prototype, 'value', Object.getOwnPropertyDescriptor(FakeInput.prototype, 'value'))

globalThis.HTMLInputElement = FakeInput
globalThis.HTMLTextAreaElement = FakeTextArea
globalThis.Event = class {
  constructor(type, init) {
    this.type = type
    this.bubbles = init?.bubbles === true
  }
}
globalThis.document = { activeElement: null, getSelection: () => null, createRange: () => ({}) }

const { insertText } = await import('../src/targets.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const rename = new FakeInput('输入按钮-快捷键-插件')
// A rename dialog selects the old name; the whole field is the selection.
rename.selectionStart = 0
rename.selectionEnd = rename.value.length
assert.equal(insertText({ element: rename, kind: 'field' }, '今天天气不错'), true)
assert.equal(rename.value, '输入按钮-快捷键-插件 今天天气不错')
ok('a fully selected field receives the transcript at the end, not instead of its content')

insertText({ element: rename, kind: 'field' }, '第二句')
assert.equal(rename.value, '输入按钮-快捷键-插件 今天天气不错 第二句')
ok('a second utterance appends after the first')

const empty = new FakeInput('')
insertText({ element: empty, kind: 'field' }, '第一句')
assert.equal(empty.value, '第一句')
ok('an empty field takes the transcript without a leading space')

const spaced = new FakeInput('已有内容 ')
insertText({ element: spaced, kind: 'field' }, '你好')
assert.equal(spaced.value, '已有内容 你好')
ok('existing trailing whitespace is not doubled')

const textarea = new globalThis.HTMLTextAreaElement('abc')
insertText({ element: textarea, kind: 'field' }, 'd')
assert.equal(textarea.value, 'abc d')
assert.deepEqual(textarea.events, ['input'])
ok('a textarea appends and emits one input event')

const removed = new FakeInput('x')
removed.isConnected = false
assert.equal(insertText({ element: removed, kind: 'field' }, 'y'), false)
ok('a removed field reports failure so the caller can offer a retry')

console.log(`\n${passed} assertions passed`)
