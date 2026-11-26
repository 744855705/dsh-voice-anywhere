/**
 * The one shortcut, registered in the official shortcut catalog.
 *
 * It owns no recording logic: pressing the shortcut resolves the same control
 * the mouse would press — the composer's official microphone or our floating
 * instance — so "one key" and "one click" can never diverge.
 *
 * The command is registered **unbound** on purpose: the key is the user's
 * choice, made once in Settings → Shortcuts. Declaring a default here would
 * both decide for them and risk the host rejecting the whole command because
 * one platform profile reserves the combination.
 */
import { planActivation } from './activate.ts'

/** Modal identifiers our command may run inside; unlabelled dialogs report `other`. */
const MODALS = ['settings', 'shortcuts', 'platform', 'sidebar', 'other']

/**
 * Register the toggle command without a binding.
 * @param ctx - client context carrying the shortcuts service.
 * @param t - translator for this plugin's namespace.
 * @param report - diagnostic sink for a rejected registration.
 * @returns the registration disposer.
 */
export function registerShortcut(ctx: any, t: (key: string) => string, report: (kind: string, error: unknown) => void): () => void {
  const command = {
    id: 'voice.anywhere.toggle',
    label: () => t('command'),
    aliases: ['语音', '听写', 'voice', 'dictate', 'speech'],
    defaults: {},
    regions: ['page', 'editable'],
    modals: MODALS,
    resolve: (context: { target: Element | null }) => {
      const activation = planActivation(context.target)
      return activation === null ? { status: 'pass' } : { status: 'handled', run: activation }
    },
  }
  try {
    return ctx.shortcuts.register(command)
  } catch (error) {
    report('shortcut-register', error)
    return () => {}
  }
}
