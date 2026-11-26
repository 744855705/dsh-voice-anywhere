/**
 * Composition root.
 *
 * The plugin owns three things and nothing else: the readiness mirror of the
 * official speech service, the floating instance of the official microphone,
 * and the triggers that press whichever microphone the focus points at. It
 * declares no runtime dependency on any official package: the button and the
 * capture pipeline are compiled into this artifact by `build.mjs`.
 */
import { createElement as h } from 'react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import build from 'voice-anywhere:build'
import { planActivation } from './activate.ts'
import { isCapturing } from './capture-state.ts'
import { currentConfig, loadConfig } from './config.ts'
import { installDiagnostics, note, report } from './diagnostics.ts'
import { createFace } from './face.ts'
import { FloatingMic } from './floating/view.ts'
import { DICTS, NAMESPACE } from './locales.ts'
import { createRecorder } from './recording.ts'
import { SettingsSection } from './settings/section.ts'
import { createSpeech } from './speech.ts'
import { registerShortcut } from './shortcut.ts'
import { isPageClosed, loadSubmitText, loadTriggerText } from './storage.ts'
import { parseTriggers } from './trigger/expression.ts'
import { startTriggers } from './trigger/engine.ts'
import { planSubmit } from './submit.ts'

/** Build-generated stylesheet of the reused official component. */
declare const VOICE_ANYWHERE_CSS: string

/** Rules this plugin adds on top of the reused stylesheet. */
const EXTRA_CSS = `
/* While a plain field is being recorded, the row replaces its text. */
[data-voice-anywhere-capturing] { color: transparent !important; caret-color: transparent !important; }
[data-voice-anywhere-capturing]::placeholder { color: transparent !important; }
`

/** Services the plugin cannot work without; Cordis parks it until they exist. */
export const inject = ['slots', 'locale', 'shortcuts']

/**
 * Report one failure through the shared diagnostics surface.
 * @param kind - failing step.
 * @param error - thrown value.
 */
function fail(kind: string, error: unknown): void {
  report(kind, error)
}

/**
 * Mount the floating microphone, its triggers and its settings page.
 * @param ctx - client plugin context.
 */
export function apply(ctx: any): void {
  installDiagnostics({ build })

  try {
    const t = ctx.locale.bind(NAMESPACE)
    ctx.effect(() => ctx.locale.register(NAMESPACE, DICTS))

    // The reused component ships module CSS; it is injected once and removed
    // with the plugin so a reload cannot accumulate stylesheets.
    ctx.effect(() => {
      const style = document.createElement('style')
      style.setAttribute('data-voice-anywhere-style', '')
      style.textContent = `${VOICE_ANYWHERE_CSS}${EXTRA_CSS}`
      document.head.appendChild(style)
      return () => { style.remove() }
    })

    const speech = createSpeech(ctx)
    const recorder = createRecorder()
    ctx.effect(() => recorder.dispose)

    // The setup dialog offers a jump into the voice bundle's detail page only
    // while the Plugins navigation exists, exactly like the official button.
    const navigation = createSnapshotStore(false)
    ctx.inject(['pluginNavigation'], (scope: any) => {
      navigation.set(true)
      scope.effect(() => () => { navigation.set(false) })
    })

    const face = createFace({ ctx, speech, recorder, navigation })

    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'voice-anywhere.button',
      locale: NAMESPACE,
      inject: () => face,
    }, FloatingMic))

    ctx.effect(() => registerShortcut(ctx, t, fail))

    // Keep readiness live: a speech plugin that mounts later, or a transport
    // hiccup, must not leave the button showing its setup affordance forever.
    ctx.effect(() => {
      void speech.observe()
      return () => speech.dispose()
    })

    // Custom triggers run beside the official shortcut, never instead of it.
    // The list is parsed once per save instead of on every keystroke.
    let voiceTriggers = parseTriggers(loadTriggerText(currentConfig().triggers))
    let submitTriggers = parseTriggers(loadSubmitText(currentConfig().submit))
    const refreshTriggers = (): void => {
      voiceTriggers = parseTriggers(loadTriggerText(currentConfig().triggers))
      submitTriggers = parseTriggers(loadSubmitText(currentConfig().submit))
    }
    window.addEventListener('storage', refreshTriggers)
    ctx.effect(() => {
      const stop = startTriggers([
        { triggers: () => (isCapturing() ? [] : voiceTriggers), fire: () => { planActivation()?.() } },
        { triggers: () => (isCapturing() ? [] : submitTriggers), fire: () => { planSubmit()?.() } },
      ])
      return () => { stop(); window.removeEventListener('storage', refreshTriggers) }
    })

    // The policy is deny-by-default; a failed load keeps every plain field off.
    // The section label needs `t`, hence this effect lives inside the block.
    ctx.effect(() => {
      let section: (() => void) | null = null
      let cancelled = false
      void loadConfig().then(config => {
        // The file decides whether the page exists; closing it from inside only
        // silences this exact revision.
        if (cancelled || !config.settingsPage || isPageClosed(config.revision, config.profile)) return
        // `settings.section` is declared by the settings plugin, so injection is
        // the contract: it waits for the slot and re-registers if it is rebuilt.
        section = ctx.slots.inject('settings.section', () => ctx.slots.register(
          { name: 'settings.section', id: 'voice-anywhere', order: 70, locale: NAMESPACE, label: () => t('settings.label') },
          () => h(SettingsSection, { t, profile: config.profile, onClose: () => { section?.(); section = null } }),
        ))
        note({ section: 'registered' })
      }).catch(error => fail('config', error))
      return () => { cancelled = true; section?.() }
    })
  } catch (error) {
    // A failure here must never take the official microphone down with it.
    fail('activate', error)
  }
}
