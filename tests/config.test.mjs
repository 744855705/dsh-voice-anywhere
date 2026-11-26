/**
 * Configuration parsing: anything off-schema is dropped, and an unreachable
 * host can never widen what the plugin attaches to.
 */
import assert from 'node:assert/strict'

const { DEFAULT_CONFIG, currentConfig, loadConfig, normalizeConfig, setConfig } = await import('../src/config.ts')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

assert.deepEqual(normalizeConfig(null), DEFAULT_CONFIG)
assert.equal(normalizeConfig({}).settingsPage, true)
assert.equal(normalizeConfig({ settingsPage: false }).settingsPage, false)
ok('the settings page is visible by default and only an explicit false hides it')
assert.deepEqual(normalizeConfig('nope'), DEFAULT_CONFIG)
ok('a non-object payload falls back to the default')

assert.deepEqual(
  normalizeConfig({
    allow: ['#a', '', 7, 'input[aria-label="x"]'],
    disable: ['dialog', 'bogus', 3],
    triggers: ['Ctrl+Shift+Space', '', 5],
    settingsPage: true,
    revision: 'abc123', profile: 'web',
  }),
  { allow: ['#a', 'input[aria-label="x"]'], disable: ['dialog'], triggers: ['Ctrl+Shift+Space'], submit: [], settingsPage: true, revision: 'abc123', profile: 'web' },
)
ok('only string selectors and known targets survive')

setConfig(DEFAULT_CONFIG)
const failing = async () => { throw new Error('offline') }
await assert.rejects(() => loadConfig(failing), /offline/u)
assert.deepEqual(currentConfig(), DEFAULT_CONFIG)
ok('a failed fetch rejects and leaves the deny-by-default configuration')

setConfig(DEFAULT_CONFIG)
const okFetch = async () => ({ ok: true, json: async () => ({ allow: ['#field'], disable: ['shortcuts'], triggers: ['Mouse:Back'], settingsPage: true, revision: 'r7', profile: 'web' }) })
const loaded = await loadConfig(okFetch)
assert.deepEqual(loaded, { allow: ['#field'], disable: ['shortcuts'], triggers: ['Mouse:Back'], submit: [], settingsPage: true, revision: 'r7', profile: 'web' })
assert.deepEqual(currentConfig(), loaded)
ok('a successful fetch replaces the configuration')

const notOk = async () => ({ ok: false, status: 404, json: async () => ({}) })
await assert.rejects(() => loadConfig(notOk), /404/u)
assert.deepEqual(currentConfig(), loaded)
ok('a non-OK response rejects and keeps the previous configuration')

console.log(`\n${passed} assertions passed`)
