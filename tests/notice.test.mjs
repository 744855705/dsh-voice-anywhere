/**
 * The state line the settings page shows: tone and text for every verdict.
 */
import assert from 'node:assert/strict'
import { format } from '../src/locales.ts'
import { markBlocked, setVerdict } from '../src/stale.ts'
import { staleNotice } from '../src/settings/stale-notice.ts'

const t = key => ({
  'settings.stale': 'built {built}, installed {installed}',
  'settings.staleUnknown': 'verify failed: {reason}',
  'settings.staleBroken': 'incompatible',
}[key] ?? key)

assert.equal(staleNotice(t), null)
setVerdict({ state: 'match', built: 'aaaa', installed: 'aaaa', reason: null })
assert.equal(staleNotice(t), null)
console.log('ok 1 - a matching copy shows no notice')

setVerdict({ state: 'mismatch', built: 'aaaa1111', installed: 'bbbb2222', reason: null })
assert.deepEqual(staleNotice(t), { tone: 'danger', text: 'built aaaa1111, installed bbbb2222' })
console.log('ok 2 - a mismatch warns and names both hashes')

setVerdict({ state: 'unknown', built: 'aaaa1111', installed: null, reason: 'not installed' })
assert.deepEqual(staleNotice(t), { tone: 'warn', text: 'verify failed: not installed' })
console.log('ok 3 - an unreadable install is muted, not an error')

markBlocked()
setVerdict({ state: 'match', built: 'aaaa1111', installed: 'aaaa1111', reason: null })
assert.deepEqual(staleNotice(t), { tone: 'danger', text: 'incompatible' })
console.log('ok 4 - a control taken down by a render failure wins over the verdict')

assert.equal(format('a {x} b {y}', { x: '1', y: '2' }), 'a 1 b 2')
assert.equal(format('keep {missing}', {}), 'keep {missing}')
console.log('ok 5 - placeholders fill, and unknown ones stay visible')

console.log('\n5 assertions passed')
