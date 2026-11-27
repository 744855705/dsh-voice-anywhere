/**
 * The settings-page sentence for the official-code verdict.
 *
 * Rendering-free on purpose: the text and tone are the part worth testing, and
 * the component that draws them should not own the wording.
 */
import type { NoticeTone } from '../components/notice.ts'
import { format } from '../locales.ts'
import { isBlocked, verdictOf } from '../stale.ts'

/**
 * Describe the official-code state, when it is worth mentioning.
 * @param t - translator bound to this plugin's namespace.
 * @returns tone and text, or null when the copy matches.
 */
export function staleNotice(t: (key: string) => string): { tone: NoticeTone; text: string } | null {
  if (isBlocked()) return { tone: 'danger', text: t('settings.staleBroken') }
  const verdict = verdictOf()
  if (verdict === null || verdict.state === 'match') return null
  if (verdict.state === 'unknown') {
    return { tone: 'warn', text: format(t('settings.staleUnknown'), { reason: verdict.reason ?? 'unknown' }) }
  }
  return {
    tone: 'danger',
    text: format(t('settings.stale'), {
      baseline: verdict.baselineRev?.slice(0, 8) ?? '?',
      current: verdict.rev?.slice(0, 8) ?? '?',
    }),
  }
}

