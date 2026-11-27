/**
 * The error boundary takes the control down instead of the page.
 */
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// The boundary imports react as a module; map it to the two exports it uses.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'react') {
      return { url: new URL('./support/react-stub.mjs', import.meta.url).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

const { ErrorBoundary } = await import('../src/components/error-boundary.ts')

let reported = null
const boundary = new ErrorBoundary({ children: 'control', onError: error => { reported = error } })
assert.equal(boundary.render(), 'control')
console.log('ok 1 - a healthy control renders')

assert.deepEqual(ErrorBoundary.getDerivedStateFromError(), { failed: true })
boundary.state = ErrorBoundary.getDerivedStateFromError()
assert.equal(boundary.render(), null)
console.log('ok 2 - a thrown render removes the control')

const boom = new Error('boom')
boundary.componentDidCatch(boom)
assert.equal(reported, boom)
console.log('ok 3 - the failure is reported to the host diagnostics')

console.log('\n3 assertions passed')
