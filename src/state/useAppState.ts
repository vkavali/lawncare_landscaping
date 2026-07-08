import AsyncStorage from '@react-native-async-storage/async-storage'
import { useEffect, useState } from 'react'
import { type Language, type TabId } from '../data'
import { getTranslation } from '../i18n'

export function useAppState() {
  const [language, setLanguage] = useState<Language>('es')
  const [tab, setTab] = useState<TabId>('hoy')
  const [crewMode, setCrewMode] = useState(false)
  const [demoMode, setDemoMode] = useState(false)

  useEffect(() => {
    AsyncStorage.setItem('preferred-language', language).catch(() => undefined)
  }, [language])

  useEffect(() => {
    AsyncStorage.setItem('demo-mode', demoMode ? 'true' : 'false').catch(() => undefined)
  }, [demoMode])

  const copy = getTranslation(language)

  return {
    language,
    setLanguage,
    tab,
    setTab,
    crewMode,
    setCrewMode,
    demoMode,
    setDemoMode,
    copy,
  }
}
