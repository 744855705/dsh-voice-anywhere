/**
 * Content hash of everything that determines the built bundle.
 *
 * Shared by the build (which stamps it into `client.js`) and by the CI check
 * (which recomputes it), so "source edited but not rebuilt" cannot ship.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

/** Files whose content can change behaviour, relative to the package root. */
const ROOTS = ['src', 'host']
const MANIFESTS = ['package.json', 'cordis.patch.yml']
const EXTENSIONS = /\.(ts|mjs|js|json|yml|css)$/u

/**
 * Compute the hash.
 * @param root - package root.
 * @returns a short hex digest.
 */
export function sourceHash(root) {
  const files = []
  const walk = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name)
      if (entry.isDirectory()) walk(path)
      else if (EXTENSIONS.test(entry.name)) files.push(path)
    }
  }
  for (const rootDir of ROOTS) walk(join(root, rootDir))
  for (const manifest of MANIFESTS) files.push(join(root, manifest))
  const digest = createHash('sha256')
  for (const file of files.sort()) {
    digest.update(relative(root, file))
    digest.update(readFileSync(file))
  }
  return digest.digest('hex').slice(0, 16)
}
