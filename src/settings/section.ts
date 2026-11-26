/**
 * The plugin's own settings page.
 *
 * It exists only when the profile's configuration asks for it, and it only
 * edits triggers: the configuration file stays the single place that decides
 * what may be recorded into, which keeps this page from becoming a second,
 * silently divergent policy editor.
 */
import { createElement as h, useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { setCapturing as setGlobalCapturing } from '../capture-state.ts'
import { currentConfig } from '../config.ts'
import { closePage, loadTriggerText, saveTriggerText } from '../storage.ts'
import { STYLE } from './styles.ts'
import { expressionOf } from '../trigger/expression.ts'

/**
 * Render the trigger editor.
 * @param props - translator and the callback that removes the page again.
 * @returns the section body.
 */
export function SettingsSection(props: any) {
  const { t, profile, onClose } = props
  const [values, setValues] = useState<string[]>(() => loadTriggerText(currentConfig().triggers))
  const [capturing, setCapturing] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!capturing) return undefined
    // The engine stays quiet while recording; otherwise the combination being
    // added would fire dictation on its way into the list.
    setGlobalCapturing(true)
    const capture = (event: KeyboardEvent | MouseEvent): void => {
      const expression = expressionOf(event)
      if (expression === null) {
        // A bare modifier or a character with no code: ask again, say nothing.
        if ('button' in event || !event.code) return
        setMessage(`${t('settings.rejected')} ${event.code}`)
        return
      }
      event.preventDefault()
      event.stopPropagation()
      const next = [...values.filter(value => value !== expression), expression]
      setValues(next)
      saveTriggerText(next)
      setMessage(`${t('settings.captured')} ${expression}`)
      setCapturing(false)
    }
    window.addEventListener('keydown', capture, true)
    window.addEventListener('mousedown', capture, true)
    return () => {
      window.removeEventListener('keydown', capture, true)
      window.removeEventListener('mousedown', capture, true)
      setGlobalCapturing(false)
    }
  }, [capturing, values, t])

  const remove = (value: string): void => {
    const next = values.filter(entry => entry !== value)
    setValues(next)
    saveTriggerText(next)
  }
  const close = (): void => {
    const config = currentConfig()
    closePage(config.revision, profile ?? config.profile)
    onClose?.()
  }

  return h('div', { style: STYLE.page },
    h('p', { style: STYLE.hint }, t('settings.hint')),
    values.length === 0
      ? h('p', { style: STYLE.hint }, t('settings.empty'))
      : h('div', { style: STYLE.list }, values.map(value => h('div', { key: value, style: STYLE.row },
          h('code', null, value),
          h(Button, { variant: 'outline', onClick: () => remove(value) }, t('settings.remove'))))),
    h('div', { style: STYLE.actions },
      h(Button, { variant: 'primary', onClick: () => { setMessage(''); setCapturing(!capturing) } },
        capturing ? t('settings.capturing') : t('settings.capture')),
      h(Button, { variant: 'outline', onClick: close }, t('settings.close'))),
    message === '' ? null : h('p', { style: STYLE.hint }, message))
}
