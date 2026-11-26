#!/usr/bin/env node
/**
 * Build the browser artifact from the installed DSH sources.
 *
 * Why build-time: the official microphone is a React component that the voice
 * package exposes only as source (`./src/*`). Reusing that source keeps the
 * button, its capture row and the recording pipeline identical to the official
 * one, at the cost of a rebuild after a DSH upgrade. Nothing from the official
 * packages is required at runtime.
 *
 * The artifact is a `window.__ModuleLoader__.load({ id, factory })` bundle whose
 * factory receives the loader's module table as `require`, so `react`,
 * `react/jsx-runtime`, `react-dom` and the client platform packages stay shared.
 */
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { sourceHash } from './scripts/source-hash.mjs'

const HERE = dirname(fileURLToPath(import.meta.url))
const MANIFEST = JSON.parse(readFileSync(join(HERE, 'package.json'), 'utf8'))
const VOICE_BUNDLE = '@deepseek-ai/dsh-experimental-voice-input-bundle'
const VOICE_CLIENT = '@deepseek-ai/dsh-experimental-client-ui-voice-input'
const EXTERNALS = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client',
  '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-primitives',
]
const CSS_PREFIX = '\u0000voice-anywhere-css:'
const CSS_SUFFIX = '?va-module'
const CSS_GLOBAL = 'VOICE_ANYWHERE_CSS'

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
 * Resolve the installed voice client package through the bundle that depends on it.
 * @param anchors - installation directories.
 * @returns its directory and version.
 */
function resolveVoice(anchors) {
  for (const anchor of anchors) {
    try {
      const bundlePath = createRequire(join(anchor, 'noop.js')).resolve(`${VOICE_BUNDLE}/package.json`)
      const voicePath = createRequire(bundlePath).resolve(`${VOICE_CLIENT}/package.json`)
      return { directory: dirname(voicePath), version: JSON.parse(readFileSync(voicePath, 'utf8')).version }
    } catch { /* try the next anchor */ }
  }
  fail(`cannot resolve ${VOICE_CLIENT}: is ${VOICE_BUNDLE} installed for the running DSH?`)
}

/**
 * Resolve a build-time tool from the installation or the checkout above it.
 * @param name - module specifier.
 * @param anchors - installation directories.
 * @returns the resolved module path.
 */
function resolveTool(name, anchors) {
  const bases = anchors.flatMap(anchor => [anchor, dirname(anchor), dirname(dirname(anchor))])
  for (const base of [...bases, process.cwd(), HERE]) {
    try {
      return createRequire(createRequire(join(base, 'noop.js')).resolve('tsdown/package.json')).resolve(name)
    } catch { /* keep looking */ }
  }
  fail(`cannot resolve build tool ${name}: build on a machine that has the DSH source checkout or tsdown installed`)
}

/**
 * Compile one stylesheet into a hashed class map plus its CSS text.
 * @param lightning - lightningcss module.
 * @param file - absolute stylesheet path.
 * @param sheets - collected stylesheet text.
 * @returns ESM source for the class map.
 */
function compileSheet(lightning, file, sheets) {
  const out = lightning.transform({ filename: file, code: readFileSync(file), cssModules: true })
  const classMap = Object.fromEntries(Object.entries(out.exports).map(([key, value]) => [key, value.name]))
  sheets.push(out.code.toString())
  return `export default ${JSON.stringify(classMap)}`
}

async function main() {
  const anchors = installAnchors()
  if (anchors.length === 0) fail('cannot locate the DSH installation: set DSH_INSTALL_DIR')
  const voice = resolveVoice(anchors)
  const rolldownPath = resolveTool('rolldown', anchors)
  const lightningPath = resolveTool('lightningcss', anchors)
  const { rolldown } = await import(pathToFileURL(rolldownPath).href)
  const lightning = (await import(pathToFileURL(lightningPath).href)).default ?? await import(pathToFileURL(lightningPath).href)

  const sheets = []
  const cssPlugin = {
    name: 'voice-anywhere:css',
    resolveId(id, importer) {
      if (!id.endsWith('.module.css')) return null
      return CSS_PREFIX + resolve(dirname(importer ?? HERE), id) + CSS_SUFFIX
    },
    load(id) {
      if (!id.startsWith(CSS_PREFIX)) return null
      return compileSheet(lightning, id.slice(CSS_PREFIX.length, -CSS_SUFFIX.length), sheets)
    },
  }

  const build = {
    official: voice.version,
    builtAt: new Date().toISOString(),
    engines: MANIFEST.engines?.dsh ?? null,
    // Hash of everything that can change behaviour. `npm run check-build`
    // recomputes it, so a source edit that was never rebuilt cannot ship.
    srcHash: sourceHash(HERE),
  }
  const stampPlugin = {
    name: 'voice-anywhere:stamp',
    resolveId(id) { return id === 'voice-anywhere:build' ? '\u0000voice-anywhere:build' : null },
    load(id) { return id === '\u0000voice-anywhere:build' ? `export default ${JSON.stringify(build)}` : null },
  }

  const bundle = await rolldown({
    input: join(HERE, 'src/client.ts'),
    external: EXTERNALS,
    plugins: [cssPlugin, stampPlugin],
    resolve: { alias: { 'voice-official': join(voice.directory, 'src/client') } },
    logLevel: 'warn',
  })
  const generated = await bundle.generate({ format: 'cjs', exports: 'named' })
  const chunk = generated.output.find(item => item.type === 'chunk')
  if (!chunk) fail('rolldown produced no chunk')
  await bundle.close()

  const code = [
    'window.__ModuleLoader__.load({',
    `  id: ${JSON.stringify(MANIFEST.name)},`,
    '  factory(require) {',
    '    var module = { exports: {} };',
    '    var exports = module.exports;',
    chunk.code,
    `    const ${CSS_GLOBAL} = ${JSON.stringify(sheets.join('\n'))};`,
    '    return module.exports;',
    '  },',
    '});',
    '',
  ].join('\n')

  const outFile = join(HERE, 'client.js')
  writeFileSync(outFile, code)
  console.log(`[voice-anywhere] official ${voice.version} · ${sheets.length} stylesheet(s) · ${statSync(outFile).size} bytes → client.js`)
}

/**
 * Print a build failure and exit non-zero.
 * @param message - reason to report.
 */
function fail(message) {
  console.error(`[voice-anywhere] ${message}`)
  process.exit(1)
}

await main()
