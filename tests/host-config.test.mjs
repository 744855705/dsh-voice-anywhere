/**
 * Host configuration file: profile resolution, first-run creation, and the
 * broken-file fallback that keeps the client on its safe default.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const { DEFAULT_BODY, configPath, ensureConfigFile, readConfigBody, profileDirOf, workDir } = await import('../host/config.mjs')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

assert.equal(profileDirOf({ profileContext: { dir: '/p/web' } }), '/p/web')
assert.equal(profileDirOf({ profileContext: { dir: '   ' } }), null)
assert.equal(profileDirOf({}), null)
assert.equal(profileDirOf(undefined), null)
ok('the profile comes from profileContext.dir, the launcher-only service')

const root = mkdtempSync(join(process.cwd(), '.tmp-host-'))
try {
  const file = ensureConfigFile(root)
  assert.equal(file, configPath(root))
  assert.equal(file, join(workDir(root), 'config.json'))
  assert.equal(readFileSync(file, 'utf8'), DEFAULT_BODY)
  ok('the first run creates the working directory and an empty configuration')

  assert.deepEqual(JSON.parse(readConfigBody(root)), { allow: [], disable: [], triggers: [], submit: [] })
  ok('the route body parses as the expected shape')

  writeFileSync(file, '{"allow":["#x"],"disable":["dialog"]}')
  assert.deepEqual(JSON.parse(readConfigBody(root)), { allow: ['#x'], disable: ['dialog'] })
  ok('an edited file is served as written')

  writeFileSync(file, '{ not json')
  assert.equal(readConfigBody(root), DEFAULT_BODY)
  ok('a broken file falls back to the default instead of failing')
} finally {
  rmSync(root, { recursive: true, force: true })
}

console.log(`\n${passed} assertions passed`)
