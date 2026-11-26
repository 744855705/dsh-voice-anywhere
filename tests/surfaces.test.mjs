/**
 * Surface resolution: which host answers, and which one wins when several are
 * open. The rule matters because a dialog is appended after the card, and the
 * composer is never a candidate.
 */
import assert from 'node:assert/strict'

class ElementStub {
  closest() { return null }
  matches() { return false }
  getBoundingClientRect() { return { width: 200, height: 24, top: 0, left: 0, right: 200, bottom: 24 } }
  getClientRects() { return [{}] }
  focus() {}
}
globalThis.HTMLElement = ElementStub
globalThis.HTMLInputElement = class extends ElementStub {
  constructor() { super(); this.type = 'text'; this.disabled = false; this.readOnly = false }
}
globalThis.HTMLTextAreaElement = class extends ElementStub {
  constructor() { super(); this.disabled = false; this.readOnly = false }
}
globalThis.window = { innerWidth: 1200, innerHeight: 800 }
globalThis.document = { activeElement: null, querySelector: () => null, querySelectorAll: () => [] }

const { findSurface } = await import('../src/surfaces.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

const field = new globalThis.HTMLTextAreaElement()

/** Host whose `matches` answers one selector family. */
const host = marker => ({
  matches: selector => String(selector).includes(marker),
  querySelectorAll: () => [field],
})

/** Route the document to the given hosts, in document order. */
const hosts = list => {
  globalThis.document.querySelectorAll = () => list
  globalThis.document.querySelector = () => null
}

hosts([])
assert.equal(findSurface(), null)
ok('no host and no focus resolves to nothing')

hosts([host('data-question-key')])
assert.equal(findSurface()?.kind, 'question-card')
ok('a question card is found without focus')

hosts([host('data-question-key'), host('role="dialog"')])
assert.equal(findSurface()?.kind, 'dialog')
ok('the last host in document order wins, so a dialog covers the card')

hosts([host('data-shortcut-modal="shortcuts"')])
assert.equal(findSurface()?.kind, 'shortcuts')
ok('the shortcut reference is its own surface')

hosts([host('role="dialog"')])
globalThis.document.querySelector = selector => (String(selector).includes('data-shortcut-modal="settings"') ? {} : null)
assert.equal(findSurface(), null)
ok('a dialog behind an open settings panel stays hidden')

hosts([host('data-shortcut-modal="shortcuts"')])
assert.equal(findSurface()?.kind, 'shortcuts')
ok('the shortcut reference survives an open settings panel')

globalThis.document.querySelector = () => null
globalThis.document.activeElement = field
field.closest = selector => (String(selector).includes('data-voice-input') ? {} : null)
assert.equal(findSurface()?.kind, 'plain')
ok('a focused marked field resolves as plain')

field.closest = () => null
assert.equal(findSurface(), null)
ok('a focused plain field without a marker is invisible')

console.log(`\n${passed} assertions passed`)
