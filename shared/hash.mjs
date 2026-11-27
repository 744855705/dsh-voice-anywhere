/**
 * Content hash of a fixed file set.
 *
 * The same algorithm runs at build time (over `src/vendor/voice-input`) and at
 * runtime (over the installed official package), which is what makes "the code
 * is identical" a fact rather than an assumption.
 */
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Hash a file list by path and bytes, in a stable order.
 * @param root - directory the paths are relative to.
 * @param paths - relative file paths.
 * @returns a hex digest.
 */
export function hashFiles(root, paths) {
  const digest = createHash('sha256')
  for (const relative of [...paths].sort()) {
    digest.update(relative)
    digest.update('\u0000')
    digest.update(readFileSync(join(root, relative)))
  }
  return digest.digest('hex')
}

/** Marker prepended to every vendored file so tsc leaves third-party code alone. */
export const VENDOR_HEADER = '// @ts-nocheck — vendored copy of the official voice UI; see PROVENANCE.json\n'

/**
 * Remove the vendoring marker, so a local copy hashes like its upstream source.
 * @param bytes - file content.
 * @returns the content without the marker line.
 */
export function stripVendorHeader(bytes) {
  const text = bytes.toString('utf8')
  return text.startsWith(VENDOR_HEADER) ? Buffer.from(text.slice(VENDOR_HEADER.length)) : bytes
}

/**
 * Hash a file list after stripping the vendoring marker.
 * @param root - directory the paths are relative to.
 * @param paths - relative file paths.
 * @returns a hex digest.
 */
export function hashVendoredFiles(root, paths) {
  const digest = createHash('sha256')
  for (const relative of [...paths].sort()) {
    digest.update(relative)
    digest.update('\u0000')
    digest.update(stripVendorHeader(readFileSync(join(root, relative))))
  }
  return digest.digest('hex')
}

/**
 * Hash one buffer.
 * @param buffer - content to hash.
 * @returns a hex digest.
 */
export function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}
