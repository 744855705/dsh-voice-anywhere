/**
 * Composition root.
 *
 * The plugin owns three things and nothing else: the readiness mirror of the
 * official speech service, the floating instance of the official microphone,
 * and the one shortcut that presses whichever microphone the focus points at.
 * It declares no runtime dependency on any official package: the button and the
 * capture pipeline are compiled into this artifact by `build.mjs`.
 */
import { createElement as h } from 'react'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-store'
import { de, en, es, fr, ja, pt, ru, zh } from 'voice-official/locales.ts'
import build from 'voice-anywhere:build'
import { planActivation } from './activate.ts'
import { isCapturing } from './capture-state.ts'
import { currentConfig, loadConfig } from './config.ts'
import { FloatingMic } from './FloatingMic.ts'
import { SettingsSection } from './settings-page.ts'
import { isPageClosed, loadTriggerText } from './storage.ts'
import { parseTriggers, startTriggers } from './triggers.ts'
import { createRecorder } from './recording.ts'
import { createSpeech } from './speech.ts'
import { registerShortcut } from './shortcut.ts'

/** Build-generated stylesheet of the reused official component. */
declare const VOICE_ANYWHERE_CSS: string

const NS = 'voice-anywhere'
const VOICE_BUNDLE = '@deepseek-ai/dsh-experimental-voice-input-bundle'
const MAX_EVENTS = 50

/** One command label per shipped locale, so the shortcut list never falls back to a key name. */
const COMMAND_LABEL: Record<'zh' | 'en' | 'ja' | 'es' | 'fr' | 'de' | 'ru' | 'pt', string> = {
  zh: '任意输入框语音输入',
  en: 'Voice input in any text field',
  ja: '任意の入力欄で音声入力',
  es: 'Dictado en cualquier campo de texto',
  fr: 'Dictée dans n’importe quel champ',
  de: 'Spracheingabe in jedem Textfeld',
  ru: 'Голосовой ввод в любом поле',
  pt: 'Ditado em qualquer campo de texto',
}

/** The settings page's own copy, as flat keys — the locale service indexes dicts literally. */
const SETTINGS_TEXT: Record<'zh' | 'en', Record<string, string>> = {
  zh: {
    'settings.label': '语音输入',
    'settings.hint': '在这里添加触发键（键盘组合或鼠标键）。官方快捷键列表里的组合仍然有效，两者并存。',
    'settings.empty': '还没有自定义触发键。',
    'settings.capture': '录制按键',
    'settings.capturing': '请按下按键或鼠标键…',
    'settings.captured': '已添加：',
    'settings.rejected': '这个组合无法用作触发键：',
    'settings.remove': '删除',
    'settings.close': '关闭此设置页',
  },
  en: {
    'settings.label': 'Voice input',
    'settings.hint': 'Add triggers (a key combination or a mouse button). Combinations in the official shortcut list keep working; both run side by side.',
    'settings.empty': 'No custom trigger yet.',
    'settings.capture': 'Record a trigger',
    'settings.capturing': 'Press a key or a mouse button…',
    'settings.captured': 'Added:',
    'settings.rejected': 'That combination cannot be a trigger:',
    'settings.remove': 'Remove',
    'settings.close': 'Close this page',
  },
} as const

const DICTS = {
  zh: { ...zh, command: COMMAND_LABEL.zh, ...SETTINGS_TEXT.zh },
  en: { ...en, command: COMMAND_LABEL.en, ...SETTINGS_TEXT.en },
  ja: { ...ja, command: COMMAND_LABEL.ja, ...SETTINGS_TEXT.en },
  es: { ...es, command: COMMAND_LABEL.es, ...SETTINGS_TEXT.en },
  fr: { ...fr, command: COMMAND_LABEL.fr, ...SETTINGS_TEXT.en },
  de: { ...de, command: COMMAND_LABEL.de, ...SETTINGS_TEXT.en },
  ru: { ...ru, command: COMMAND_LABEL.ru, ...SETTINGS_TEXT.en },
  pt: { ...pt, command: COMMAND_LABEL.pt, ...SETTINGS_TEXT.en },
}

/** Services the plugin cannot work without; Cordis parks it until they exist. */
export const inject = ['slots', 'locale', 'shortcuts']

/**
 * Mount the floating microphone and its shortcut.
 * @param ctx - client plugin context.
 */
export function apply(ctx: any): void {
  const events: Array<{ kind: string; message: string; at: string }> = []
  const report = (kind: string, error: unknown): void => {
    const message = error instanceof Error ? error.message : String(error)
    events.push({ kind, message, at: new Date().toISOString() })
    if (events.length > MAX_EVENTS) events.shift()
    console.warn(`[voice-anywhere] ${kind}: ${message}`)
  }
  ;(window as any).__voiceAnywhere = { build, events }
  try {
    const t = ctx.locale.bind(NS)
    ctx.effect(() => ctx.locale.register(NS, DICTS))

    // The policy is deny-by-default; a failed load keeps every plain field off.
    // It lives inside this block because the nav label needs `t`, which is
    // declared here: a thunk defined outside would throw when the shell asks
    // for the label, and the settings row would render without text.
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
          { name: 'settings.section', id: 'voice-anywhere', order: 70, locale: NS, label: () => t('settings.label') },
          () => h(SettingsSection, { t, profile: config.profile, onClose: () => { section?.(); section = null } }),
        ))
        ;(window as any).__voiceAnywhere = { ...(window as any).__voiceAnywhere, section: 'registered' }
      }).catch(error => report('config', error))
      return () => { cancelled = true; section?.() }
    })

    // The reused component ships module CSS; it is injected once and removed
    // with the plugin so a reload cannot accumulate stylesheets.
    ctx.effect(() => {
      const style = document.createElement('style')
      style.setAttribute('data-voice-anywhere-style', '')
      style.textContent = `${VOICE_ANYWHERE_CSS}
/* While a plain field is being recorded, the row replaces its text. */
[data-voice-anywhere-capturing] { color: transparent !important; caret-color: transparent !important; }
[data-voice-anywhere-capturing]::placeholder { color: transparent !important; }`
      document.head.appendChild(style)
      return () => { style.remove() }
    })

    const speech = createSpeech(ctx)
    const recorder = createRecorder()
    ctx.effect(() => recorder.dispose)

    // The setup dialog offers a jump into the voice bundle's detail page only
    // while the Plugins navigation exists, exactly like the official button.
    // Registered directly: the effect belongs to this plugin's fiber, and
    // wrapping `ctx.inject` in `ctx.effect` would dispose a fiber, not a handle.
    const navigation = createSnapshotStore(false)
    ctx.inject(['pluginNavigation'], (scope: any) => {
      navigation.set(true)
      scope.effect(() => () => { navigation.set(false) })
    })

    const face = {
      hooks: {
        speechReadiness: speech.store,
        microphoneDevice: recorder.devices,
        pluginNavigation: navigation,
      },
      createRecording: () => recorder.createRecording(),
      transcribe: (request: unknown, signal: AbortSignal) => speech.transcribe(request, signal),
      openSettings: (): void => {
        try {
          ctx.get('pluginNavigation')?.openBundle(VOICE_BUNDLE)
        } catch (error) {
          report('open-settings', error)
        }
      },
      prepare: (providerId: string, options?: unknown) => speech.prepare(providerId, options),
      cancelPreparation: (providerId: string) => speech.cancelPreparation(providerId),
      configure: (patch: unknown) => speech.configure(patch),
      selectMicrophone: (device: { id: string; label: string }) => { recorder.devices.set(device) },
      refreshReadiness: () => speech.refresh(),
    }

    ctx.slots.inject('shell.overlay', () => ctx.slots.register({
      name: 'shell.overlay',
      id: 'voice-anywhere.button',
      locale: NS,
      inject: () => face,
    }, FloatingMic))

    ctx.effect(() => registerShortcut(ctx, t, report))

    // Read one snapshot immediately: the shortcut needs a usable control state
    // before the first field is ever focused.
    // Keep readiness live: a speech plugin that mounts later, or a transport
    // hiccup, must not leave the button showing its setup affordance forever.
    ctx.effect(() => {
      void speech.observe()
      return () => speech.dispose()
    })

    // Custom triggers run beside the official shortcut, never instead of it.
    // The list is parsed once per save instead of on every keystroke.
    let parsed = parseTriggers(loadTriggerText(currentConfig().triggers))
    const refreshTriggers = (): void => { parsed = parseTriggers(loadTriggerText(currentConfig().triggers)) }
    window.addEventListener('storage', refreshTriggers)
    ctx.effect(() => {
      const stop = startTriggers({
        triggers: () => (isCapturing() ? [] : parsed),
        fire: () => { planActivation()?.() },
      })
      return () => { stop(); window.removeEventListener('storage', refreshTriggers) }
    })
  } catch (error) {
    // A failure here must never take the official microphone down with it.
    report('activate', error)
  }
}
