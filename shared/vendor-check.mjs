/**
 * The judgement `check-vendor` makes, separated from the filesystem plumbing so
 * it can be exercised on a temporary tree.
 */

/**
 * List what is wrong with the vendored copy.
 * @param input - hashes and recorded provenance.
 * @param input.localHash - hash of the files in this repository.
 * @param input.upstreamHash - hash of the installed official package.
 * @param input.provenance - recorded manifest, or null when missing.
 * @returns human-readable problems; empty when the copy is consistent.
 */
export function vendorProblems({ localHash, upstreamHash, provenance }) {
  if (provenance === null || provenance === undefined) return ['src/vendor/voice-input/PROVENANCE.json is missing; run `npm run vendor`']
  const problems = []
  if (localHash !== provenance.hash) problems.push('vendored files were edited or the file list changed; run `npm run vendor`')
  if (upstreamHash !== provenance.hash) {
    problems.push(`installed official package ${provenance.version} differs from the vendored copy; run \`npm run vendor\` and review the diff`)
  }
  return problems
}
