/**
 * Fail when `client.js` was not rebuilt after the last source change.
 *
 * The bundle carries the hash of the sources it was built from, so this check
 * never has to guess from timestamps.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sourceHash } from './source-hash.mjs'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const bundle = readFileSync(join(root, 'client.js'), 'utf8')
const stamped = /srcHash":\s*"([0-9a-f]+)"/u.exec(bundle)?.[1]
const current = sourceHash(root)

if (stamped === undefined) {
  console.error('check-build: the bundle carries no source hash; run `npm run build`')
  process.exit(1)
}
if (stamped !== current) {
  console.error(`check-build: client.js is stale (bundle ${stamped}, sources ${current}); run \`npm run build\``)
  process.exit(1)
}
console.log(`check-build: ok (${current})`)
