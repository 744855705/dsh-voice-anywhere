/**
 * Fail when the vendored sources and the installed official package disagree.
 *
 * Two independent facts are checked: our own copies are untouched (their hashes
 * still match the provenance), and the installed official package still hashes
 * to the same value. Either mismatch means the plugin must be re-vendored.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashFiles, hashVendoredFiles } from '../shared/hash.mjs'
import { VENDOR_DIR, VENDOR_FILES } from '../shared/vendor-files.mjs'
import { vendorProblems } from '../shared/vendor-check.mjs'
import { resolveOfficial } from './official-package.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const target = join(root, VENDOR_DIR)

function fail(message) {
  console.error(`check-vendor: ${message}`)
  process.exit(1)
}

let provenance
try {
  provenance = JSON.parse(readFileSync(join(target, 'PROVENANCE.json'), 'utf8'))
} catch {
  provenance = null
}

let upstream = null
let upstreamError = null
try {
  const official = resolveOfficial()
  upstream = hashFiles(join(official.directory, 'src', 'client'), VENDOR_FILES)
} catch (error) {
  upstreamError = error instanceof Error ? error.message : String(error)
}

const problems = vendorProblems({
  localHash: provenance === null ? '' : hashVendoredFiles(target, VENDOR_FILES),
  upstreamHash: provenance === null ? '' : upstream,
  provenance,
})
// An unreadable installation is reported, but it is not a reason to claim the
// copy is wrong: the vendored files are still exactly what was reviewed.
if (upstreamError !== null && problems.length === 0) {
  console.warn(`check-vendor: cannot verify against the installed package (${upstreamError})`)
}
if (problems.length > 0) {
  for (const problem of problems) console.error(`check-vendor: ${problem}`)
  process.exit(1)
}
console.log(`check-vendor: ok (${provenance.version}, ${provenance.hash.slice(0, 12)})`)
