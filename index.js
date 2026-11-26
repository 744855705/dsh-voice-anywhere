/**
 * Host half: publishes the profile's configuration to the browser.
 *
 * Everything else in this plugin runs in the client; this entry exists so the
 * policy can live in a real file under the profile instead of being compiled
 * into the bundle.
 */
import { ensureConfigFile, profileDirOf, readConfigPayload } from './host/config.mjs'

export const name = 'voice-anywhere'

/** The route needs the host web server; the plugin parks until it exists. */
export const inject = ['webServer', 'profileContext']

/** Public route; the body is the plugin's allowlist, never a secret. */
const ROUTE = '/voice-anywhere/config.json'

/**
 * Create the working directory and register the configuration route.
 * @param ctx - host plugin context.
 */
export function apply(ctx) {
  const profileDir = profileDirOf(ctx)
  if (profileDir === null) {
    console.warn('[voice-anywhere] no profile context; the configuration stays empty')
    return
  }
  try {
    ensureConfigFile(profileDir)
  } catch (error) {
    console.warn(`[voice-anywhere] cannot prepare ${profileDir}: ${error instanceof Error ? error.message : String(error)}`)
    return
  }
  // The route is anonymous on purpose: the body is the user's selector list,
  // never a secret, and requiring a session would silently disable every plain
  // field whenever the browser's fetch is not admitted.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    auth: 'anonymous',
    resource: async () => new Response(readConfigPayload(profileDir).payload, {
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    }),
  }), 'voice-anywhere: config route')
}
