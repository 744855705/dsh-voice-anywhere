/**
 * Host entry: the plugin prepares its profile directory and answers the
 * configuration route with whatever the file currently holds.
 */
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const { apply, inject } = await import('../index.js')

let passed = 0
function ok(name) {
  passed += 1
  console.log(`ok ${passed} - ${name}`)
}

assert.deepEqual(inject, ['webServer', 'profileContext'])
ok('the entry declares the web server and profile dependencies')

const root = mkdtempSync(join(process.cwd(), '.tmp-apply-'))
try {
  const routes = []
  let effects = 0
  const ctx = {
    profileContext: { dir: root },
    effect: run => { effects += 1; run() },
    webServer: { register: route => { routes.push(route); return () => {} } },
  }
  apply(ctx)
  assert.equal(effects, 1)
  assert.equal(routes.length, 1)
  assert.equal(routes[0].kind, 'exact')
  assert.equal(routes[0].path, '/voice-anywhere/config.json')
  ok('apply registers one exact route through an effect')

  const file = join(root, 'voice-anywhere', 'config.json')
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { allow: [], disable: [], triggers: [], submit: [] })
  ok('the first run creates the profile working directory and an empty file')

  const empty = await routes[0].resource()
  assert.equal(empty.headers.get('content-type'), 'application/json; charset=utf-8')
  const emptyBody = await empty.json()
  assert.equal(typeof emptyBody.revision, 'string')
  assert.ok(emptyBody.revision.length > 0, 'the response carries the file revision')
  assert.equal(emptyBody.profile, root.split('/').pop())
  ok('the route serves the file as JSON with its revision')

  writeFileSync(file, '{"allow":["#x"],"disable":[]}')
  const edited = await (await routes[0].resource()).json()
  assert.equal(edited.allow[0], '#x')
  assert.notEqual(edited.revision, emptyBody.revision, 'an edit changes the revision')
  ok('an edit is served on the next request without a restart')
} finally {
  rmSync(root, { recursive: true, force: true })
}

const skipped = []
apply({ profileContext: undefined, effect: run => { skipped.push(run) }, webServer: { register: () => () => {} } })
assert.equal(skipped.length, 0)
ok('a context without a profile registers nothing')

console.log(`\n${passed} assertions passed`)
