/**
 * Run every test file and exit non-zero if any assertion fails.
 *
 * Each file is a plain node script: no runner dependency, and a failure prints
 * its own stack where it happened.
 */
import { readdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const tests = readdirSync(join(root, 'tests'))
  .filter(name => name.endsWith('.test.mjs'))
  .sort()

let failed = 0
let assertions = 0
for (const name of tests) {
  const run = spawnSync(process.execPath, [join(root, 'tests', name)], { encoding: 'utf8' })
  const passed = /(\d+) assertions passed/u.exec(run.stdout ?? '')
  if (run.status !== 0) {
    failed += 1
    console.error(`✗ ${name}`)
    console.error(`${run.stdout ?? ''}${run.stderr ?? ''}`)
    continue
  }
  assertions += passed === null ? 0 : Number(passed[1])
  console.log(`✓ ${name} (${passed === null ? '?' : passed[1]})`)
}
console.log(`\n${tests.length - failed}/${tests.length} files, ${assertions} assertions`)
process.exit(failed === 0 ? 0 : 1)
