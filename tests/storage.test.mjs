/**
 * What the settings page stores: trigger text, and the "closed for this
 * revision" mark that only a configuration edit clears.
 */
import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => { store.set(key, value) },
}

const { closePage, isPageClosed, loadTriggerText, saveTriggerText } = await import('../src/storage.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

assert.deepEqual(loadTriggerText(['Ctrl+/']), ['Ctrl+/'])
ok('with nothing saved the configuration value is used')

saveTriggerText(['Ctrl+Shift+Space'])
assert.deepEqual(loadTriggerText(['Ctrl+/']), ['Ctrl+Shift+Space'])
ok('a saved list wins over the configuration')

store.set('dsh.voice-anywhere.triggers', '{ not json')
assert.deepEqual(loadTriggerText(['Ctrl+/']), ['Ctrl+/'])
ok('a broken saved value falls back to the configuration')

assert.equal(isPageClosed('a1', 'web'), false)
closePage('a1', 'web')
assert.equal(isPageClosed('a1', 'web'), true)
assert.equal(isPageClosed('a2', 'web'), false)
assert.equal(isPageClosed('a1', 'other'), false)
ok('the close mark is scoped to one revision and one profile')

const refusing = () => { throw new Error('denied') }
const writable = globalThis.localStorage
globalThis.localStorage = { getItem: refusing, setItem: refusing }
assert.deepEqual(loadTriggerText(['Ctrl+/']), ['Ctrl+/'])
assert.equal(isPageClosed('a1', 'web'), false)
saveTriggerText(['Ctrl+X'])
closePage('a1', 'web')
ok('a refusing storage degrades to the configuration value instead of throwing')
globalThis.localStorage = writable

console.log(`\n${passed} assertions passed`)
