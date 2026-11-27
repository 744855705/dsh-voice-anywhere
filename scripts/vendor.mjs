/**
 * Copy the official UI sources this plugin reuses into `src/vendor`.
 *
 * Explicit and reviewable: the copy happens here and nowhere else, the source
 * version and per-file hashes are recorded, and the previous copies are
 * compared before they are replaced so a version bump shows its diff.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { hashBuffer, hashVendoredFiles, VENDOR_HEADER } from '../shared/hash.mjs'
import { VENDOR_DIR, VENDOR_FILES } from '../shared/vendor-files.mjs'
import { resolveOfficial } from './official-package.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const target = join(root, VENDOR_DIR)
const provenancePath = join(root, VENDOR_DIR, 'PROVENANCE.json')

/**
 * Read the provenance of the previous run, when it exists.
 * @returns the recorded manifest, or null on a first run.
 */
function previous() {
  try {
    return JSON.parse(readFileSync(provenancePath, 'utf8'))
  } catch {
    return null
  }
}

/**
 * Copy one official file and hash it.
 * @param official - resolved official package.
 * @param file - file name inside the package's client source directory.
 * @returns the digest of the copied bytes.
 */
function copyOne(official, file) {
  const from = join(official.directory, 'src', 'client', file)
  if (!existsSync(from)) throw new Error(`official package has no src/client/${file}`)
  const bytes = readFileSync(from)
  // The marker tells tsc to leave third-party code alone; CSS must stay verbatim.
  const header = /\.[jt]sx?$/u.test(file) ? Buffer.from(VENDOR_HEADER) : Buffer.alloc(0)
  writeFileSync(join(target, file), Buffer.concat([header, bytes]))
  return hashBuffer(bytes)
}

function main() {
  const official = resolveOfficial()
  mkdirSync(target, { recursive: true })
  const before = previous()
  const files = {}
  for (const file of VENDOR_FILES) files[file] = copyOne(official, file)
  const hash = hashVendoredFiles(target, VENDOR_FILES)
  const next = {
    package: official.manifest.name,
    version: official.manifest.version,
    license: official.manifest.license ?? null,
    hash,
    files,
    vendoredAt: new Date().toISOString(),
  }
  writeFileSync(provenancePath, `${JSON.stringify(next, null, 2)}\n`)

  // Report what this run changed, so a version bump is visible before commit.
  if (before === null) {
    console.log(`vendor: copied ${VENDOR_FILES.length} files from ${next.version} (${hash.slice(0, 12)})`)
    return
  }
  const added = VENDOR_FILES.filter(file => !(file in before.files))
  const removed = Object.keys(before.files ?? {}).filter(file => !VENDOR_FILES.includes(file))
  const changed = VENDOR_FILES.filter(file => before.files?.[file] !== files[file])
  const same = added.length === 0 && removed.length === 0 && changed.length === 0
  console.log(`vendor: ${before.version} -> ${next.version}, hash ${before.hash.slice(0, 12)} -> ${hash.slice(0, 12)}`)
  if (same) console.log('vendor: no file content changed')
  for (const file of changed) console.log(`vendor: changed ${file}`)
  for (const file of added) console.log(`vendor: added ${file}`)
  for (const file of removed) console.log(`vendor: removed ${file}`)
}

main()
