import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { apiFetch } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { theme } from '../styles/theme'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY','DC',
]

const COMMON_SERVICES = {
  en: ['Lawn mowing', 'Edging', 'Fertilizing', 'Weed control', 'Leaf cleanup', 'Pruning', 'Irrigation'],
  es: ['Corte de césped', 'Bordeado', 'Fertilización', 'Control de maleza', 'Limpieza de hojas', 'Poda', 'Riego'],
}

const copy = {
  en: {
    steps: ['Business', 'Location', 'Language', 'Services', 'Pricing'],
    businessLabel: 'Business name',
    businessHint: 'How customers will see you',
    locationLabel: 'City & state',
    city: 'City',
    state: 'State (2-letter)',
    langLabel: 'Primary language',
    langEn: 'English',
    langEs: 'Spanish',
    servicesLabel: 'Services you offer',
    servicesHint: 'Select all that apply',
    pricingLabel: 'Base pricing',
    pricingHint: 'You can edit these later',
    mowingPrice: 'Lawn mowing (per visit)',
    edgingPrice: 'Edging add-on',
    next: 'Next',
    back: 'Back',
    finish: 'Get started',
    saving: 'Setting up your account…',
  },
  es: {
    steps: ['Negocio', 'Ubicación', 'Idioma', 'Servicios', 'Precios'],
    businessLabel: 'Nombre del negocio',
    businessHint: 'Así te verán tus clientes',
    locationLabel: 'Ciudad y estado',
    city: 'Ciudad',
    state: 'Estado (2 letras)',
    langLabel: 'Idioma principal',
    langEn: 'Inglés',
    langEs: 'Español',
    servicesLabel: 'Servicios que ofreces',
    servicesHint: 'Selecciona todos los que apliquen',
    pricingLabel: 'Precios base',
    pricingHint: 'Los puedes cambiar después',
    mowingPrice: 'Corte de césped (por visita)',
    edgingPrice: 'Bordeado adicional',
    next: 'Siguiente',
    back: 'Atrás',
    finish: 'Comenzar',
    saving: 'Configurando tu cuenta…',
  },
}

type Props = { onDone: () => void }

export default function OnboardingScreen({ onDone }: Props) {
  const { tenant } = useAuth()
  const [step, setStep] = useState(0)
  const [language, setLanguage] = useState<'en' | 'es'>('en')
  const t = copy[language]

  const [businessName, setBusinessName] = useState(tenant?.name ?? '')
  const [city, setCity] = useState('')
  const [state, setState] = useState('TX')
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [mowingCents, setMowingCents] = useState('5000')
  const [edgingCents, setEdgingCents] = useState('1500')
  const [saving, setSaving] = useState(false)

  const toggleService = (svc: string) =>
    setSelectedServices((prev) =>
      prev.includes(svc) ? prev.filter((s) => s !== svc) : [...prev, svc],
    )

  const finish = async () => {
    setSaving(true)
    try {
      await Promise.all(
        selectedServices.map((name, i) =>
          apiFetch('/api/catalog', {
            method: 'POST',
            body: JSON.stringify({
              name,
              unitPriceCents: i === 0 ? Number(mowingCents) : i === 1 ? Number(edgingCents) : 0,
              active: true,
            }),
          }),
        ),
      )
      onDone()
    } catch {
      onDone()
    } finally {
      setSaving(false)
    }
  }

  if (saving) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={theme.green} />
        <Text style={styles.savingText}>{t.saving}</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.stepBar}>
        {t.steps.map((label, i) => (
          <View key={label} style={[styles.stepDot, i <= step && styles.stepDotActive]}>
            <Text style={[styles.stepLabel, i <= step && styles.stepLabelActive]}>{label}</Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 && (
          <>
            <Text style={styles.heading}>{t.businessLabel}</Text>
            <Text style={styles.hint}>{t.businessHint}</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              placeholderTextColor={theme.textMuted}
            />
          </>
        )}

        {step === 1 && (
          <>
            <Text style={styles.heading}>{t.locationLabel}</Text>
            <TextInput
              style={styles.input}
              placeholder={t.city}
              placeholderTextColor={theme.textMuted}
              value={city}
              onChangeText={setCity}
              autoCapitalize="words"
            />
            <TextInput
              style={styles.input}
              placeholder={t.state}
              placeholderTextColor={theme.textMuted}
              value={state}
              onChangeText={(v) => setState(v.toUpperCase().slice(0, 2))}
              autoCapitalize="characters"
              maxLength={2}
            />
            {state.length === 2 && !US_STATES.includes(state) && (
              <Text style={styles.errorText}>Enter a valid US state code</Text>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.heading}>{t.langLabel}</Text>
            {(['en', 'es'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.optionRow, language === lang && styles.optionRowSelected]}
                onPress={() => setLanguage(lang)}
              >
                <View style={[styles.radio, language === lang && styles.radioSelected]} />
                <Text style={styles.optionText}>{lang === 'en' ? t.langEn : t.langEs}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.heading}>{t.servicesLabel}</Text>
            <Text style={styles.hint}>{t.servicesHint}</Text>
            {COMMON_SERVICES[language].map((svc) => (
              <TouchableOpacity
                key={svc}
                style={[styles.optionRow, selectedServices.includes(svc) && styles.optionRowSelected]}
                onPress={() => toggleService(svc)}
              >
                <View style={[styles.checkbox, selectedServices.includes(svc) && styles.checkboxSelected]}>
                  {selectedServices.includes(svc) && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.optionText}>{svc}</Text>
              </TouchableOpacity>
            ))}
          </>
        )}

        {step === 4 && (
          <>
            <Text style={styles.heading}>{t.pricingLabel}</Text>
            <Text style={styles.hint}>{t.pricingHint}</Text>
            <Text style={styles.fieldLabel}>{t.mowingPrice}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={(Number(mowingCents) / 100).toFixed(0)}
                onChangeText={(v) => setMowingCents(String(Math.round(Number(v.replace(/\D/g, '')) * 100)))}
                keyboardType="number-pad"
                placeholderTextColor={theme.textMuted}
              />
            </View>
            <Text style={styles.fieldLabel}>{t.edgingPrice}</Text>
            <View style={styles.priceRow}>
              <Text style={styles.dollar}>$</Text>
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={(Number(edgingCents) / 100).toFixed(0)}
                onChangeText={(v) => setEdgingCents(String(Math.round(Number(v.replace(/\D/g, '')) * 100)))}
                keyboardType="number-pad"
                placeholderTextColor={theme.textMuted}
              />
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.navRow}>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep((s) => s - 1)}>
            <Text style={styles.backText}>{t.back}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, step === 0 && { marginLeft: 'auto' }]}
          onPress={step < 4 ? () => setStep((s) => s + 1) : finish}
        >
          <Text style={styles.nextText}>{step < 4 ? t.next : t.finish}</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  savingText: { color: theme.text, fontSize: 16 },
  stepBar: { flexDirection: 'row', justifyContent: 'center', gap: 4, paddingTop: 24, paddingHorizontal: 16 },
  stepDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  stepDotActive: { backgroundColor: theme.green },
  stepLabel: { fontSize: 10, color: theme.textMuted, textAlign: 'center', marginTop: 4 },
  stepLabelActive: { color: theme.green, fontWeight: '600' },
  content: { padding: 24, gap: 12, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700', color: theme.text, marginBottom: 4 },
  hint: { fontSize: 14, color: theme.textMuted, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    color: theme.text,
    fontSize: 16,
    backgroundColor: theme.surface,
  },
  errorText: { color: theme.red, fontSize: 13 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  optionRowSelected: { borderColor: theme.green, backgroundColor: theme.greenLight },
  optionText: { color: theme.text, fontSize: 15 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: theme.border },
  radioSelected: { borderColor: theme.green, backgroundColor: theme.green },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: { borderColor: theme.green, backgroundColor: theme.green },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  fieldLabel: { fontSize: 14, color: theme.textMuted, fontWeight: '500' },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dollar: { fontSize: 20, color: theme.text, fontWeight: '600' },
  priceInput: { flex: 1 },
  navRow: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  backButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  backText: { color: theme.text, fontWeight: '600', fontSize: 16 },
  nextButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: theme.green,
    alignItems: 'center',
  },
  nextText: { color: '#fff', fontWeight: '700', fontSize: 16 },
})
