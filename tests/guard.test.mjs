/**
 * The official-code guard: a hash comparison, never a version comparison.
 */
import assert from 'node:assert/strict'
import { evaluateOfficial } from '../src/guard.ts'

const BUILT = 'a'.repeat(12) + '0123'

assert.deepEqual(evaluateOfficial({ version: '0.2.3-alpha.2', hash: BUILT, reason: null }, BUILT), {
  state: 'match', built: BUILT, installed: BUILT, reason: null,
})
assert.equal(evaluateOfficial({ version: '0.2.3-alpha.2', hash: BUILT, reason: null }, BUILT).state, 'match')
console.log('ok 1 - identical hashes match, whatever the version says')

const changed = evaluateOfficial({ version: '0.2.3-alpha.2', hash: 'b'.repeat(12) + '9999', reason: null }, BUILT)
assert.equal(changed.state, 'mismatch')
assert.equal(changed.built, BUILT)
assert.equal(changed.installed, 'b'.repeat(12) + '9999')
console.log('ok 2 - a different hash reports a mismatch but stays runnable')

const sameVersionNewCode = evaluateOfficial({ version: '0.2.3-alpha.2', hash: 'c'.repeat(16), reason: null }, BUILT)
assert.equal(sameVersionNewCode.state, 'mismatch')
console.log('ok 3 - a version bump alone matches; only code changes mismatch')

const unknown = evaluateOfficial({ version: null, hash: null, reason: 'cannot locate the DSH installation' }, BUILT)
assert.equal(unknown.state, 'unknown')
assert.equal(unknown.reason, 'cannot locate the DSH installation')
console.log('ok 4 - an unreadable package is unknown, not a refusal')

const absent = evaluateOfficial(undefined, BUILT)
assert.equal(absent.state, 'unknown')
console.log('ok 5 - a failed configuration request is unknown too')

console.log('\n5 assertions passed')
