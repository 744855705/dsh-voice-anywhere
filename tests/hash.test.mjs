/**
 * The hash shared by build, host and the vendor check.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { hashBuffer, hashFiles, hashVendoredFiles, stripVendorHeader, VENDOR_HEADER } from '../shared/hash.mjs'

const root = mkdtempSync(join(tmpdir(), 'va-hash-'))
writeFileSync(join(root, 'b.ts'), 'second')
writeFileSync(join(root, 'a.ts'), 'first')

const forward = hashFiles(root, ['a.ts', 'b.ts'])
assert.equal(hashFiles(root, ['b.ts', 'a.ts']), forward)
console.log('ok 1 - file order does not change the hash')

writeFileSync(join(root, 'a.ts'), 'first!')
assert.notEqual(hashFiles(root, ['a.ts', 'b.ts']), forward)
console.log('ok 2 - one changed byte changes the hash')

assert.equal(stripVendorHeader(Buffer.from(`${VENDOR_HEADER}body`)).toString(), 'body')
assert.equal(stripVendorHeader(Buffer.from('body')).toString(), 'body')
console.log('ok 3 - the vendoring marker is stripped, absent markers pass through')

// Same path, same bytes, one with the vendoring marker: hashes must agree.
const marked = mkdtempSync(join(tmpdir(), 'va-hash-marked-'))
writeFileSync(join(root, 'x.ts'), 'first!')
writeFileSync(join(marked, 'x.ts'), `${VENDOR_HEADER}first!`)
assert.equal(hashVendoredFiles(marked, ['x.ts']), hashFiles(root, ['x.ts']))
writeFileSync(join(marked, 'x.ts'), `${VENDOR_HEADER}first?`)
assert.notEqual(hashVendoredFiles(marked, ['x.ts']), hashFiles(root, ['x.ts']))
console.log('ok 4 - a marked copy hashes like its upstream source, and edits still show')

console.log('\n4 assertions passed')
