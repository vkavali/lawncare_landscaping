import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import * as Localization from 'expo-localization'
import en from './en.json'
import es from './es.json'

const locale = Localization.getLocales()[0]?.languageTag ?? 'en-US'

const SUPPORTED = ['en', 'es'] as const
type Supported = (typeof SUPPORTED)[number]

function detectLang(): Supported {
  const tag = locale.toLowerCase()
  if (tag.startsWith('es')) return 'es'
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
  },
  lng: detectLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
})

export default i18n
export { detectLang }
export type { Supported as SupportedLocale }
