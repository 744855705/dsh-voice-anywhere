/**
 * The official-code guard: a revision comparison, never a version comparison.
 */
import assert from 'node:assert/strict'
import { evaluateOfficial } from '../src/guard.ts'

const BUILT = '0.2.3-alpha.2'

// First run, same release: adopt the baseline and report a match.
const first = evaluateOfficial({ rev: 'rev-a', releaseVersion: BUILT, builtVersion: BUILT, baseline: null })
assert.deepEqual(first, { state: 'match', rev: 'rev-a', baselineRev: null, reason: null, adopt: true })
console.log('ok 1 - a first run on the same release adopts its baseline')

// First run, different release: cannot tell whether the code moved, so say so.
const newer = evaluateOfficial({ rev: 'rev-a', releaseVersion: '0.2.3-alpha.9', builtVersion: BUILT, baseline: null })
assert.equal(newer.state, 'unknown')
assert.match(newer.reason, /alpha\.9/)
assert.equal(newer.adopt, true)
console.log('ok 2 - a first run on another release reports unknown')

// Same revision as the baseline: match, even after a release bump.
const same = evaluateOfficial({ rev: 'rev-a', releaseVersion: '0.2.3-alpha.9', builtVersion: BUILT, baseline: { built: BUILT, rev: 'rev-a' } })
assert.deepEqual(same, { state: 'match', rev: 'rev-a', baselineRev: 'rev-a', reason: null, adopt: false })
console.log('ok 3 - an unchanged revision matches even when the release moved')

// Changed revision: the official code moved.
const moved = evaluateOfficial({ rev: 'rev-b', releaseVersion: BUILT, builtVersion: BUILT, baseline: { built: BUILT, rev: 'rev-a' } })
assert.equal(moved.state, 'changed')
assert.equal(moved.baselineRev, 'rev-a')
assert.equal(moved.adopt, true)
console.log('ok 4 - a different revision reports a change')

// A baseline from another build says nothing: re-adopt instead of comparing.
const stale = evaluateOfficial({ rev: 'rev-c', releaseVersion: BUILT, builtVersion: BUILT, baseline: { built: '0.1.0', rev: 'rev-a' } })
assert.equal(stale.state, 'match')
assert.equal(stale.adopt, true)
console.log('ok 5 - a baseline recorded by another build is replaced, not compared')

// No official entry at all: unknowable, and nothing to adopt.
const missing = evaluateOfficial({ rev: null, releaseVersion: BUILT, builtVersion: BUILT, baseline: null })
assert.equal(missing.state, 'unknown')
assert.equal(missing.adopt, false)
console.log('ok 6 - a missing official entry is unknown')

console.log('\n6 assertions passed')
