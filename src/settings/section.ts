/**
 * The plugin's own settings page.
 *
 * It exists to record triggers, nothing else: the configuration file stays the
 * single place that decides where dictation may happen, so this page can never
 * become a second, silently divergent policy editor.
 */
import { createElement as h, useEffect, useState } from 'react'
import { Button } from '@deepseek-ai/dsh-client-ui-primitives'
import { setCapturing as setGlobalCapturing } from '../capture-state.ts'
import { currentConfig } from '../config.ts'
import { closePage, loadSubmitText, loadTriggerText, saveSubmitText, saveTriggerText } from '../storage.ts'
import { expressionOf } from '../trigger/expression.ts'
import { Notice } from '../components/notice.ts'
import { staleNotice } from './stale-notice.ts'
import { STYLE } from './styles.ts'

/** The two independent trigger lists the page edits. */
type Column = 'voice' | 'submit'

/**
 * Render one editable trigger list.
 * @param props - translator, copy, values and the three callbacks.
 * @returns the column.
 */
function TriggerColumn(props: any) {
  const { t, title, hint, values, capturing, onToggle, onRemove } = props
  return h('section', { style: STYLE.list },
    h('div', { style: STYLE.row },
      h('strong', null, title),
      h(Button, { variant: capturing ? 'primary' : 'outline', onClick: onToggle },
        capturing ? t('settings.capturing') : t('settings.capture'))),
    h('p', { style: STYLE.hint }, hint),
    values.length === 0
      ? h('p', { style: STYLE.hint }, t('settings.empty'))
      : h('div', { style: STYLE.list }, values.map((value: string) => h('div', { key: value, style: STYLE.row },
          h('code', null, value),
          h(Button, { variant: 'outline', onClick: () => onRemove(value) }, t('settings.remove'))))))
}

/**
 * Render the trigger editor.
 * @param props - translator, profile name, and the callback that removes the page.
 * @returns the section body.
 */
export function SettingsSection(props: any) {
  const { t, profile, onClose } = props
  const [voice, setVoice] = useState<string[]>(() => loadTriggerText(currentConfig().triggers))
  const [submit, setSubmit] = useState<string[]>(() => loadSubmitText(currentConfig().submit))
  const [capturing, setCapturing] = useState<Column | null>(null)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (capturing === null) return undefined
    // The engine goes quiet while recording, or the combination being added
    // would fire the action it is meant to configure.
    setGlobalCapturing(true)
    const capture = (event: KeyboardEvent | MouseEvent): void => {
      const expression = expressionOf(event)
      if (expression === null) {
        if ('button' in event || !event.code) return
        setMessage(`${t('settings.rejected')} ${event.code}`)
        return
      }
      event.preventDefault()
      event.stopPropagation()
      if (capturing === 'voice') {
        const next = [...voice.filter(entry => entry !== expression), expression]
        setVoice(next)
        saveTriggerText(next)
      } else {
        const next = [...submit.filter(entry => entry !== expression), expression]
        setSubmit(next)
        saveSubmitText(next)
      }
      setMessage(`${t('settings.captured')} ${expression}`)
      setCapturing(null)
    }
    window.addEventListener('keydown', capture, true)
    window.addEventListener('mousedown', capture, true)
    return () => {
      window.removeEventListener('keydown', capture, true)
      window.removeEventListener('mousedown', capture, true)
      setGlobalCapturing(false)
    }
  }, [capturing, voice, submit, t])

  const remove = (column: Column, value: string): void => {
    if (column === 'voice') {
      const next = voice.filter(entry => entry !== value)
      setVoice(next)
      saveTriggerText(next)
    } else {
      const next = submit.filter(entry => entry !== value)
      setSubmit(next)
      saveSubmitText(next)
    }
  }
  const toggle = (column: Column): void => {
    setMessage('')
    setCapturing(current => (current === column ? null : column))
  }
  const close = (): void => {
    const config = currentConfig()
    closePage(config.revision, profile ?? config.profile)
    onClose?.()
  }

  const notice = staleNotice(t)

  return h('div', { style: STYLE.page },
    notice === null ? null : h(Notice, notice),
    h('p', { style: STYLE.hint }, t('settings.hint')),
    h(TriggerColumn, {
      t,
      title: t('settings.voice'),
      hint: t('settings.voiceHint'),
      values: voice,
      capturing: capturing === 'voice',
      onToggle: () => toggle('voice'),
      onRemove: (value: string) => remove('voice', value),
    }),
    h(TriggerColumn, {
      t,
      title: t('settings.submit'),
      hint: t('settings.submitHint'),
      values: submit,
      capturing: capturing === 'submit',
      onToggle: () => toggle('submit'),
      onRemove: (value: string) => remove('submit', value),
    }),
    h('div', { style: STYLE.actions },
      h(Button, { variant: 'outline', onClick: close }, t('settings.close'))),
    message === '' ? null : h('p', { style: STYLE.hint }, message))
}
