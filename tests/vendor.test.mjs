/**
 * The vendor check: identical copies pass, any edit fails.
 */
import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashVendoredFiles } from '../shared/hash.mjs'
import { VENDOR_FILES } from '../shared/vendor-files.mjs'
import { vendorProblems } from '../shared/vendor-check.mjs'

const here = dirname(fileURLToPath(import.meta.url))
const source = join(here, '..', 'src', 'vendor', 'voice-input')
const provenance = JSON.parse(readFileSync(join(source, 'PROVENANCE.json'), 'utf8'))

assert.deepEqual(vendorProblems({ localHash: provenance.hash, upstreamHash: provenance.hash, provenance }), [])
console.log('ok 1 - an unmodified copy consistent with upstream passes')

const copy = mkdtempSync(join(tmpdir(), 'va-vendor-'))
cpSync(source, copy, { recursive: true })
const tampered = join(copy, VENDOR_FILES[0])
writeFileSync(tampered, `${readFileSync(tampered, 'utf8')}\n// local edit`)
const edited = hashVendoredFiles(copy, VENDOR_FILES)
assert.notEqual(edited, provenance.hash)
const problems = vendorProblems({ localHash: edited, upstreamHash: provenance.hash, provenance })
assert.equal(problems.length, 1)
assert.match(problems[0], /edited/)
console.log('ok 2 - one edited vendored file fails the check')

const upstreamMoved = vendorProblems({ localHash: provenance.hash, upstreamHash: 'ffff', provenance })
assert.equal(upstreamMoved.length, 1)
assert.match(upstreamMoved[0], /differs/)
console.log('ok 3 - an upstream change fails the check')

assert.equal(vendorProblems({ localHash: '', upstreamHash: '', provenance: null }).length, 1)
console.log('ok 4 - a missing provenance file fails with a fix')

console.log('\n4 assertions passed')
