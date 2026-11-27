/**
 * Where the running installation keeps the official voice UI, and what it
 * hashes to.
 *
 * The client cannot read package sources, so the host answers the only
 * question that matters at runtime: "is the copy this plugin was built with
 * still the code that is installed?" The answer is a content hash, not a
 * version — DSH releases weekly and the version says nothing about these files.
 */
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { hashFiles } from '../shared/hash.mjs'
import { VENDOR_FILES } from '../shared/vendor-files.mjs'

/** The bundle that owns the client row. */
const VOICE_BUNDLE = '@deepseek-ai/dsh-experimental-voice-input-bundle'
/** The client package whose UI is vendored. */
const VOICE_CLIENT = '@deepseek-ai/dsh-experimental-client-ui-voice-input'

/**
 * Candidate installation anchors, most specific first.
 * @returns absolute directories that may hold the running CLI package.
 */
function installAnchors() {
  const anchors = []
  if (process.env.DSH_INSTALL_DIR) anchors.push(process.env.DSH_INSTALL_DIR)
  for (const start of [process.argv[1] ? dirname(process.argv[1]) : undefined, process.cwd()]) {
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
 * Read the installed official package and hash its UI sources.
 * @returns the version and hash, or a reason when neither can be read. The
 * plugin treats "unknown" as usable: refusing input over a failed probe would
 * be worse than running the copy the user chose to install.
 */
export function readOfficial() {
  try {
    const anchors = installAnchors()
    if (anchors.length === 0) throw new Error('cannot locate the DSH installation')
    for (const anchor of anchors) {
      try {
        const bundlePath = createRequire(join(anchor, 'noop.js')).resolve(`${VOICE_BUNDLE}/package.json`)
        const voicePath = createRequire(bundlePath).resolve(`${VOICE_CLIENT}/package.json`)
        const directory = dirname(voicePath)
        const manifest = JSON.parse(readFileSync(voicePath, 'utf8'))
        return {
          version: manifest.version ?? null,
          hash: hashFiles(join(directory, 'src', 'client'), VENDOR_FILES),
          reason: null,
        }
      } catch { /* try the next anchor */ }
    }
    throw new Error(`${VOICE_CLIENT} is not installed for this DSH`)
  } catch (error) {
    return { version: null, hash: null, reason: error instanceof Error ? error.message : String(error) }
  }
}
