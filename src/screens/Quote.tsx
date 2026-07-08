import { Feather } from '@expo/vector-icons'
import { Pressable, ScrollView, Share, Switch, Text, TextInput, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import { Alert } from 'react-native'
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition'
import type { Dispatch, SetStateAction } from 'react'
import { useState } from 'react'
import { SectionCard } from '../components/SectionCard'
import {
  extraOptions,
  serviceDefinitions,
  translateText,
  zoneDefinitions,
  type Frequency,
  type Language,
  type ServiceType,
  type Zone,
} from '../data'
import {
  buildQuoteIntro,
  frequencyLabel,
  quoteIncludesLabel,
  quoteInvoicePrompt,
  quoteNoExtrasLabel,
  quotePaymentPrompt,
  quoteFallbackRecipient,
  quoteFallbackZone,
  type getTranslation,
} from '../i18n'
import { merchantProfile } from '../merchant'
import styles from '../styles/shared'
import { formatCurrency, formatNumber } from '../utils/format'

const frequencyDiscount: Record<Frequency, number> = {
  semanal: -0.11,
  quincenal: -0.05,
  mensual: 0,
}

const visitsPerMonth: Record<Frequency, number> = { semanal: 4, quincenal: 2, mensual: 1 }

interface QuoteScreenProps {
  language: Language
  copy: ReturnType<typeof getTranslation>
  clientName: string
  setClientName: (v: string) => void
  clientNeighborhood: string
  setClientNeighborhood: (v: string) => void
  serviceType: ServiceType
  setServiceType: (v: ServiceType) => void
  frequency: Frequency
  setFrequency: (v: Frequency) => void
  zone: Zone
  setZone: (v: Zone) => void
  area: number
  setArea: (v: number) => void
  requiresInvoice: boolean
  setRequiresInvoice: (v: boolean) => void
  selectedExtras: string[]
  quoteCustomSpanish: string
  setQuoteCustomSpanish: Dispatch<SetStateAction<string>>
  quoteCustomEnglish: string
  setQuoteCustomEnglish: Dispatch<SetStateAction<string>>
  handleExtraToggle: (extraId: string) => void
  openWhatsApp: (message: string) => void
}

export function QuoteScreen({
  language,
  copy,
  clientName,
  setClientName,
  clientNeighborhood,
  setClientNeighborhood,
  serviceType,
  setServiceType,
  frequency,
  setFrequency,
  zone,
  setZone,
  area,
  setArea,
  requiresInvoice,
  setRequiresInvoice,
  selectedExtras,
  quoteCustomSpanish,
  setQuoteCustomSpanish,
  quoteCustomEnglish,
  setQuoteCustomEnglish,
  handleExtraToggle,
  openWhatsApp,
}: QuoteScreenProps) {
  const [dictatingSpanish, setDictatingSpanish] = useState(false)

  useSpeechRecognitionEvent('start', () => setDictatingSpanish(true))
  useSpeechRecognitionEvent('end', () => setDictatingSpanish(false))
  useSpeechRecognitionEvent('result', (event) => {
    const transcript = event.results
      ?.map((item) => item.transcript?.trim())
      .filter(Boolean)
      .join(' ')
      .trim()
    if (!transcript) return
    setQuoteCustomSpanish((current) =>
      current.trim() ? `${current.trim()} ${transcript}` : transcript,
    )
  })
  useSpeechRecognitionEvent('error', (event) => {
    setDictatingSpanish(false)
    Alert.alert(copy.alerts.speechErrorTitle, event.message || event.error)
  })

  const quoteService = serviceDefinitions.find((item) => item.id === serviceType)!
  const quoteExtras = extraOptions.filter((item) => selectedExtras.includes(item.id))
  const quoteBase = quoteService.base + area * quoteService.sqmRate + zoneDefinitions[zone].fee
  const quoteExtrasTotal = quoteExtras.reduce((sum, item) => sum + item.price, 0)
  const quoteDiscount =
    serviceType === 'mantenimiento'
      ? Math.round(quoteBase * frequencyDiscount[frequency])
      : 0
  const quoteTotal = Math.max(quoteBase + quoteExtrasTotal + quoteDiscount, 1200)
  const quoteHours =
    quoteService.hours +
    area / (serviceType === 'paisajismo' ? 78 : 130) +
    quoteExtras.length * 0.7
  const quoteDeposit = Math.round(
    quoteTotal * (serviceType === 'mantenimiento' ? 0.2 : 0.38),
  )
  const quoteMonthlyPlan =
    serviceType === 'mantenimiento'
      ? Math.round(quoteTotal * visitsPerMonth[frequency])
      : 0

  const quoteRecipient = clientName.trim() || quoteFallbackRecipient(language)
  const quoteZoneName = clientNeighborhood.trim() || quoteFallbackZone(language)

  const buildQuoteMessage = (messageLanguage: Language) => {
    const quoteCopy = (messageLanguage === language ? copy : null)
    const rawCustomNote =
      messageLanguage === 'es' ? quoteCustomSpanish.trim() : quoteCustomEnglish.trim()
    const customNote = rawCustomNote.replace(/[.!?]+$/, '')

    return [
      buildQuoteIntro(
        messageLanguage,
        quoteRecipient,
        translateText(quoteService.label, messageLanguage),
        quoteZoneName,
      ),
      `${messageLanguage === 'es' ? 'Superficie estimada' : 'Estimated area'}: ${area} m2.`,
      `${quoteIncludesLabel(messageLanguage)}: ${translateText(quoteService.detail, messageLanguage)}`,
      quoteExtras.length > 0
        ? `${messageLanguage === 'es' ? 'Extras' : 'Extras'}: ${quoteExtras
            .map((item) => translateText(item.label, messageLanguage).toLowerCase())
            .join(', ')}.`
        : quoteNoExtrasLabel(messageLanguage),
      `${messageLanguage === 'es' ? 'Total estimado' : 'Total estimate'}: ${formatCurrency(quoteTotal)}.`,
      `${messageLanguage === 'es' ? 'Anticipo sugerido' : 'Suggested deposit'}: ${formatCurrency(quoteDeposit)}.`,
      requiresInvoice
        ? quoteInvoicePrompt(messageLanguage)
        : quotePaymentPrompt(messageLanguage),
      customNote ? `${messageLanguage === 'es' ? 'Nota' : 'Note'}: ${customNote}.` : null,
      merchantProfile.quoteClosing[messageLanguage],
    ]
      .filter(Boolean)
      .join(' ')
  }

  const quoteMessage = buildQuoteMessage(language)
  const quoteMessageSpanish = buildQuoteMessage('es')
  const quoteMessageEnglish = buildQuoteMessage('en')

  const startSpanishDictation = async () => {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      Alert.alert(copy.alerts.speechUnavailableTitle, copy.alerts.speechUnavailableText)
      return
    }
    const supportsOnDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()
    const permission = supportsOnDevice
      ? await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync()
      : await ExpoSpeechRecognitionModule.requestPermissionsAsync()
    if (!permission.granted) {
      Alert.alert(copy.alerts.permissionTitle, copy.alerts.speechPermissionText)
      return
    }
    ExpoSpeechRecognitionModule.start({
      lang: 'es-MX',
      interimResults: false,
      continuous: false,
      requiresOnDeviceRecognition: supportsOnDevice,
    })
  }

  const stopSpanishDictation = () => {
    ExpoSpeechRecognitionModule.stop()
  }

  const copyQuoteMessage = async (message: string, messageLanguage: 'es' | 'en') => {
    await Clipboard.setStringAsync(message)
    Alert.alert(
      copy.alerts.clipboardTitle,
      messageLanguage === 'es'
        ? copy.alerts.clipboardSpanishText
        : copy.alerts.clipboardEnglishText,
    )
  }

  const shareQuote = async () => {
    await Share.share({ message: quoteMessage })
  }

  return (
    <>
      <SectionCard
        title={copy.sections.quoteTitle}
        subtitle={copy.sections.quoteSubtitle}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{copy.labels.client}</Text>
          <TextInput
            style={styles.textInput}
            value={clientName}
            onChangeText={setClientName}
            placeholder={copy.quote.customerPlaceholder}
            placeholderTextColor="#738171"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{copy.labels.zone}</Text>
          <TextInput
            style={styles.textInput}
            value={clientNeighborhood}
            onChangeText={setClientNeighborhood}
            placeholder={copy.quote.neighborhoodPlaceholder}
            placeholderTextColor="#738171"
          />
        </View>

        <Text style={styles.subsectionLabel}>{copy.quote.serviceType}</Text>
        <View style={styles.optionWrap}>
          {serviceDefinitions.map((item) => {
            const active = item.id === serviceType
            return (
              <Pressable
                key={item.id}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setServiceType(item.id)}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {translateText(item.label, language)}
                </Text>
                <Text style={[styles.optionDetail, active && styles.optionDetailActive]}>
                  {translateText(item.crew, language)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <View style={styles.stepperCard}>
          <View>
            <Text style={styles.inputLabel}>{copy.quote.areaText}</Text>
            <Text style={styles.stepperValue}>{formatNumber(area)} m2</Text>
          </View>
          <View style={styles.stepperControls}>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setArea(Math.max(80, area - 20))}
            >
              <Feather name="minus" size={18} color="#17211b" />
            </Pressable>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setArea(Math.min(900, area + 20))}
            >
              <Feather name="plus" size={18} color="#17211b" />
            </Pressable>
          </View>
        </View>

        <Text style={styles.subsectionLabel}>{copy.quote.zoneText}</Text>
        <View style={styles.optionWrap}>
          {(Object.keys(zoneDefinitions) as Zone[]).map((zoneId) => {
            const active = zoneId === zone
            return (
              <Pressable
                key={zoneId}
                style={[styles.optionCard, active && styles.optionCardActive]}
                onPress={() => setZone(zoneId)}
              >
                <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                  {translateText(zoneDefinitions[zoneId].label, language)}
                </Text>
                <Text style={[styles.optionDetail, active && styles.optionDetailActive]}>
                  {translateText(zoneDefinitions[zoneId].note, language)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {serviceType === 'mantenimiento' ? (
          <>
            <Text style={styles.subsectionLabel}>{copy.labels.frequency}</Text>
            <View style={styles.segmentedRow}>
              {(['semanal', 'quincenal', 'mensual'] as Frequency[]).map((item) => {
                const active = frequency === item
                return (
                  <Pressable
                    key={item}
                    style={[styles.segmentButton, active && styles.segmentButtonActive]}
                    onPress={() => setFrequency(item)}
                  >
                    <Text
                      style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}
                    >
                      {frequencyLabel(language, item)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </>
        ) : null}

        <Text style={styles.subsectionLabel}>{copy.quote.extrasText}</Text>
        {extraOptions.map((extra) => {
          const active = selectedExtras.includes(extra.id)
          return (
            <Pressable
              key={extra.id}
              style={[styles.extraRow, active && styles.extraRowActive]}
              onPress={() => handleExtraToggle(extra.id)}
            >
              <View style={styles.extraMain}>
                <Text style={styles.extraTitle}>{translateText(extra.label, language)}</Text>
                <Text style={styles.extraDetail}>{translateText(extra.detail, language)}</Text>
              </View>
              <View style={styles.extraAside}>
                <Text style={styles.extraPrice}>{formatCurrency(extra.price)}</Text>
                <Feather
                  name={active ? 'check-circle' : 'plus-circle'}
                  size={18}
                  color={active ? '#195847' : '#738171'}
                />
              </View>
            </Pressable>
          )
        })}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{copy.quote.spanishNoteTitle}</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={quoteCustomSpanish}
            onChangeText={setQuoteCustomSpanish}
            placeholder={copy.quote.spanishNotePlaceholder}
            placeholderTextColor="#738171"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.footnote}>{copy.quote.spanishNoteDetail}</Text>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.smallAction}
              onPress={dictatingSpanish ? stopSpanishDictation : startSpanishDictation}
            >
              <Feather name={dictatingSpanish ? 'square' : 'mic'} size={14} color="#17211b" />
              <Text style={styles.smallActionText}>
                {dictatingSpanish ? copy.quote.stopDictation : copy.quote.dictateSpanish}
              </Text>
            </Pressable>
            <Pressable
              style={styles.smallAction}
              onPress={() => setQuoteCustomSpanish('')}
            >
              <Feather name="x-circle" size={14} color="#17211b" />
              <Text style={styles.smallActionText}>{copy.quote.clearSpanish}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{copy.quote.englishNoteTitle}</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            value={quoteCustomEnglish}
            onChangeText={setQuoteCustomEnglish}
            placeholder={copy.quote.englishNotePlaceholder}
            placeholderTextColor="#738171"
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.footnote}>{copy.quote.englishNoteDetail}</Text>
        </View>

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchTitle}>{copy.quote.invoiceTitle}</Text>
            <Text style={styles.switchDetail}>{copy.quote.invoiceDetail}</Text>
          </View>
          <Switch
            value={requiresInvoice}
            onValueChange={setRequiresInvoice}
            trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.quoteSummary}>
          <Text style={styles.quoteSummaryLabel}>{copy.labels.total}</Text>
          <Text style={styles.quoteSummaryValue}>{formatCurrency(quoteTotal)}</Text>
          <Text style={styles.quoteSummaryDetail}>
            {translateText(quoteService.crew, language)} · {quoteHours.toFixed(1)} h
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{copy.labels.baseAndArea}</Text>
            <Text style={styles.infoValue}>{formatCurrency(quoteBase)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{copy.labels.extras}</Text>
            <Text style={styles.infoValue}>{formatCurrency(quoteExtrasTotal)}</Text>
          </View>
          {serviceType === 'mantenimiento' ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.frequencyDiscount}</Text>
                <Text style={styles.infoValue}>{formatCurrency(quoteDiscount)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.monthlyPlan}</Text>
                <Text style={styles.infoValue}>{formatCurrency(quoteMonthlyPlan)}</Text>
              </View>
            </>
          ) : null}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{copy.labels.deposit}</Text>
            <Text style={styles.infoValue}>{formatCurrency(quoteDeposit)}</Text>
          </View>

          <View style={styles.messageCard}>
            <Text style={styles.messageCardTitle}>{copy.quote.readyMessage}</Text>
            <Text style={styles.messageCardText}>{quoteMessage}</Text>
          </View>
          <Text style={styles.footnote}>
            {merchantProfile.businessName} · {merchantProfile.serviceLine[language]} ·{' '}
            {merchantProfile.whatsappDisplay}
          </Text>

          <View style={styles.actionRow}>
            <Pressable
              style={styles.smallAction}
              onPress={() => openWhatsApp(quoteMessageSpanish)}
            >
              <Feather name="message-circle" size={14} color="#17211b" />
              <Text style={styles.smallActionText}>{copy.quote.whatsappSpanish}</Text>
            </Pressable>
            <Pressable
              style={styles.smallAction}
              onPress={() => copyQuoteMessage(quoteMessageSpanish, 'es')}
            >
              <Feather name="copy" size={14} color="#17211b" />
              <Text style={styles.smallActionText}>{copy.quote.copySpanish}</Text>
            </Pressable>
            <Pressable
              style={styles.smallAction}
              onPress={() => copyQuoteMessage(quoteMessageEnglish, 'en')}
            >
              <Feather name="copy" size={14} color="#17211b" />
              <Text style={styles.smallActionText}>{copy.quote.copyEnglish}</Text>
            </Pressable>
            <Pressable style={styles.smallAction} onPress={shareQuote}>
              <Feather name="share-2" size={14} color="#17211b" />
              <Text style={styles.smallActionText}>{copy.quote.share}</Text>
            </Pressable>
          </View>
        </View>
      </SectionCard>
    </>
  )
}
