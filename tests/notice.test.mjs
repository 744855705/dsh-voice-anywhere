/**
 * The state line the settings page shows: tone and text for every verdict.
 */
import assert from 'node:assert/strict'
import { format } from '../src/locales.ts'
import { markBlocked, setVerdict } from '../src/stale.ts'
import { staleNotice } from '../src/settings/stale-notice.ts'

const t = key => ({
  'settings.stale': 'baseline {baseline} current {current}',
  'settings.staleUnknown': 'verify failed: {reason}',
  'settings.staleBroken': 'incompatible',
}[key] ?? key)

assert.equal(staleNotice(t), null)
setVerdict({ state: 'match', rev: 'aaaa1111', baselineRev: 'aaaa1111', reason: null, adopt: false })
assert.equal(staleNotice(t), null)
console.log('ok 1 - a matching copy shows no notice')

setVerdict({ state: 'changed', rev: 'bbbb2222', baselineRev: 'aaaa1111', reason: null, adopt: true })
assert.deepEqual(staleNotice(t), { tone: 'danger', text: 'baseline aaaa1111 current bbbb2222' })
console.log('ok 2 - a changed revision names both revisions')

setVerdict({ state: 'unknown', rev: null, baselineRev: null, reason: 'official entry missing', adopt: false })
assert.deepEqual(staleNotice(t), { tone: 'warn', text: 'verify failed: official entry missing' })
console.log('ok 3 - an unknown state warns with its reason')

markBlocked()
setVerdict({ state: 'match', rev: 'aaaa1111', baselineRev: 'aaaa1111', reason: null, adopt: false })
assert.deepEqual(staleNotice(t), { tone: 'danger', text: 'incompatible' })
console.log('ok 4 - a control taken down by a render failure wins over the verdict')

assert.equal(format('a {x} b {y}', { x: '1', y: '2' }), 'a 1 b 2')
assert.equal(format('keep {missing}', {}), 'keep {missing}')
console.log('ok 5 - placeholders fill, and unknown ones stay visible')

console.log('\n5 assertions passed')
