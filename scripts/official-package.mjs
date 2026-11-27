/**
 * Locate the official voice client package installed for the running DSH.
 *
 * Shared by `vendor` (copy from it) and `check-vendor` (compare against it).
 * Resolution goes through the bundle that depends on it, because the client
 * package itself is not a direct dependency of anything we control.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/** The bundle that owns the client row. */
export const VOICE_BUNDLE = '@deepseek-ai/dsh-experimental-voice-input-bundle'
/** The client package whose UI is vendored. */
export const VOICE_CLIENT = '@deepseek-ai/dsh-experimental-client-ui-voice-input'

/**
 * Candidate installation anchors, most specific first.
 * @returns absolute directories that may hold the running CLI package.
 */
function installAnchors() {
  const anchors = []
  if (process.env.DSH_INSTALL_DIR) anchors.push(process.env.DSH_INSTALL_DIR)
  const starts = [process.argv[1] ? dirname(process.argv[1]) : undefined, process.cwd()]
  for (const start of starts) {
    let directory = start
    while (directory) {
      try {
        const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf8'))
        if (manifest.name === '@deepseek-ai/dsh') anchors.push(directory)
      } catch { /* not a package directory */ }
      const parent = dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }
  return [...new Set(anchors)]
}

/**
 * Resolve the installed voice client package.
 * @returns its directory and manifest.
 * @throws when no installation anchor can resolve it.
 */
export function resolveOfficial() {
  const anchors = installAnchors()
  if (anchors.length === 0) throw new Error('cannot locate the DSH installation: set DSH_INSTALL_DIR')
  for (const anchor of anchors) {
    try {
      const bundlePath = createRequire(join(anchor, 'noop.js')).resolve(`${VOICE_BUNDLE}/package.json`)
      const voicePath = createRequire(bundlePath).resolve(`${VOICE_CLIENT}/package.json`)
      return { directory: dirname(voicePath), manifest: JSON.parse(readFileSync(voicePath, 'utf8')) }
    } catch { /* try the next anchor */ }
  }
  throw new Error(`cannot resolve ${VOICE_CLIENT}: is ${VOICE_BUNDLE} installed for the running DSH?`)
}
