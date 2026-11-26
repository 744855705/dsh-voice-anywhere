/**
 * Policy: deny by default, with the four documented exceptions and the marker.
 */
import assert from 'node:assert/strict'

let settingsOpen = false
globalThis.document = { querySelector: selector => (settingsOpen && selector.includes('settings') ? {} : null) }
globalThis.HTMLElement = class {}

const { isSurfaceVisible, POLICY_SELECTORS } = await import('../src/policy.ts')
const { DEFAULT_CONFIG } = await import('../src/config.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

/** Element whose closest() answers a fixed ancestor map. */
const element = ancestors => ({ closest: selector => ancestors[selector] ?? null })

const settings = { [POLICY_SELECTORS.settings]: {} }
const platform = { [POLICY_SELECTORS.platform]: {} }
const shortcuts = { [POLICY_SELECTORS.shortcuts]: {} }
const marked = { [POLICY_SELECTORS.marker]: {} }

settingsOpen = false
assert.equal(isSurfaceVisible(element({}), 'plain', DEFAULT_CONFIG), false)
ok('a plain field is invisible without an opt-in')

assert.equal(isSurfaceVisible(element(settings), 'plain', { allow: [], disable: [] }), false)
ok('the settings panel hides every field inside it')

assert.equal(isSurfaceVisible(element(platform), 'dialog', DEFAULT_CONFIG), false)
ok('the platform overlay hides its fields')

assert.equal(isSurfaceVisible(element(marked), 'plain', DEFAULT_CONFIG), true)
ok('the data-voice-input marker opts a field in without configuration')

assert.equal(isSurfaceVisible(element({}), 'plain', { allow: ['#search'], disable: [] }), false)
assert.equal(isSurfaceVisible(element({ '#search': {} }), 'plain', { allow: ['#search'], disable: [] }), true)
ok('a configured selector opts a field in')

assert.equal(isSurfaceVisible(element({}), 'plain', { allow: [':::bad'], disable: [] }), false)
ok('an invalid selector matches nothing instead of throwing')

assert.equal(isSurfaceVisible(element({}), 'question-card', DEFAULT_CONFIG), true)
assert.equal(isSurfaceVisible(element({}), 'question-card', { allow: [], disable: ['question-card'] }), false)
ok('the question card is on by default and can be switched off')

assert.equal(isSurfaceVisible(element({}), 'dialog', DEFAULT_CONFIG), true)
assert.equal(isSurfaceVisible(element({}), 'dialog', { allow: [], disable: ['dialog'] }), false)
ok('a dialog is on by default and can be switched off')

assert.equal(isSurfaceVisible(element(shortcuts), 'shortcuts', DEFAULT_CONFIG), true)
ok('the shortcut reference keeps its microphone')

settingsOpen = true
assert.equal(isSurfaceVisible(element({}), 'dialog', DEFAULT_CONFIG), false)
ok('a dialog opened over the settings panel is hidden (plugin install, model editor)')
assert.equal(isSurfaceVisible(element(shortcuts), 'shortcuts', DEFAULT_CONFIG), true)
ok('the shortcut reference stays visible while settings is open')
settingsOpen = false

console.log(`\n${passed} assertions passed`)
