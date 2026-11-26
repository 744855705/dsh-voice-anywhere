/**
 * Every string this plugin adds to the locale service.
 *
 * The official voice component ships its own dictionaries; these overlay the
 * command label and the settings page's copy. Keys are flat: the locale service
 * indexes dictionaries literally, so `'settings.label'` is the key, not a path.
 */
import { de, en, es, fr, ja, pt, ru, zh } from 'voice-official/locales.ts'

/** The plugin's locale namespace. */
export const NAMESPACE = 'voice-anywhere'

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

/** The settings page's own copy; English carries every language written by hand here. */
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

/** Locale dictionaries installed for every shipped language. */
export const DICTS = {
  zh: { ...zh, command: COMMAND_LABEL.zh, ...SETTINGS_TEXT.zh },
  en: { ...en, command: COMMAND_LABEL.en, ...SETTINGS_TEXT.en },
  ja: { ...ja, command: COMMAND_LABEL.ja, ...SETTINGS_TEXT.en },
  es: { ...es, command: COMMAND_LABEL.es, ...SETTINGS_TEXT.en },
  fr: { ...fr, command: COMMAND_LABEL.fr, ...SETTINGS_TEXT.en },
  de: { ...de, command: COMMAND_LABEL.de, ...SETTINGS_TEXT.en },
  ru: { ...ru, command: COMMAND_LABEL.ru, ...SETTINGS_TEXT.en },
  pt: { ...pt, command: COMMAND_LABEL.pt, ...SETTINGS_TEXT.en },
}
