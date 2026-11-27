/**
 * The profile-scoped configuration file.
 *
 * A profile is the installation target (`$DSH_HOME/profiles/<name>`), so the
 * plugin's own working directory lives inside it. The host creates the file on
 * first load; the route below reads it per request, so an edit applies after a
 * page refresh without rebuilding or restarting.
 */
import { createHash } from 'node:crypto'
import { basename } from 'node:path'
import { closeSync, mkdirSync, openSync, readFileSync, writeSync } from 'node:fs'
import { join } from 'node:path'

/** Directory created inside the profile. */
export const WORK_DIR = 'voice-anywhere'

/** File read by GET /voice-anywhere/config.json. */
export const CONFIG_FILE = 'config.json'

/** Written when the file does not exist yet: nothing opted in. */
export const DEFAULT_BODY = `${JSON.stringify({ allow: [], disable: [], triggers: [], submit: [] }, null, 2)}\n`

/**
 * Locate the profile this process serves. The launcher provides it as a
 * service (`profileContext.dir`); the DSH_* variables exist only in shell tool
 * subprocesses, so reading them here would fail on a normal launch.
 * @param ctx - host plugin context.
 * @returns the profile directory, or null when the context carries none.
 */
export function profileDirOf(ctx) {
  const dir = ctx?.profileContext?.dir
  return typeof dir === 'string' && dir.trim() !== '' ? dir : null
}

/**
 * Path of the plugin's working directory.
 * @param profileDir - the profile directory.
 * @returns the directory path.
 */
export function workDir(profileDir) {
  return join(profileDir, WORK_DIR)
}

/**
 * Path of the configuration file.
 * @param profileDir - the profile directory.
 * @returns the file path.
 */
export function configPath(profileDir) {
  return join(workDir(profileDir), CONFIG_FILE)
}

/**
 * Create the working directory and an empty configuration if absent.
 * @param profileDir - the profile directory.
 * @returns the configuration file path.
 */
export function ensureConfigFile(profileDir) {
  mkdirSync(workDir(profileDir), { recursive: true })
  const file = configPath(profileDir)
  try {
    // 'wx' fails when the file exists, so a concurrent first load cannot
    // truncate a configuration the user has already written.
    const handle = openSync(file, 'wx')
    try {
      writeSync(handle, DEFAULT_BODY)
    } finally {
      closeSync(handle)
    }
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error
  }
  return file
}

/**
 * Read the configuration body, falling back to the default when it is missing
 * or not valid JSON (a broken file must never break dictation elsewhere).
 * @param profileDir - the profile directory.
 * @returns the JSON body to serve.
 */
export function readConfigBody(profileDir) {
  try {
    const body = readFileSync(configPath(profileDir), 'utf8')
    JSON.parse(body)
    return body
  } catch {
    return DEFAULT_BODY
  }
}

/**
 * Read the configuration plus the revision that identifies this version of the
 * file. The revision lets the client tell "the user edited the file" apart from
 * "nothing changed", which is what re-opens a page closed from inside itself.
 * @param profileDir - the profile directory.
 * @returns the JSON body to serve and the file's modification time.
 */
export function readConfigPayload(profileDir) {
  const body = readConfigBody(profileDir)
  // A hash, not an mtime: two edits inside one timestamp tick must still count
  // as two versions, and a copy that restores old content must not re-open a
  // page the user closed.
  const revision = createHash('sha256').update(body).digest('hex').slice(0, 16)
  const parsed = JSON.parse(body)
  return { payload: JSON.stringify({ ...parsed, revision, profile: basename(profileDir) }), revision }
}
