import AsyncStorage from '@react-native-async-storage/async-storage'
import { Feather } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as ImagePicker from 'expo-image-picker'
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition'
import { StatusBar } from 'expo-status-bar'
import type { ComponentProps, ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import {
  calendarDays,
  checklistLabels,
  collections,
  crews,
  extraOptions,
  jobs,
  leads,
  quickTemplates,
  rainAlert,
  recurringPlans,
  scheduleSlots,
  serviceDefinitions,
  tabs,
  trackingPings,
  type CollectionItem,
  type Frequency,
  type Job,
  type JobStatus,
  type Language,
  type Lead,
  type LeadStage,
  type ScheduleSlot,
  type ServiceType,
  type TabId,
  type TaskKey,
  type Zone,
  translateText,
  zoneDefinitions,
} from './src/data'
import {
  allLabel,
  buildBookedMessage,
  buildCollectionReminderMessage,
  buildCrmFollowUpMessage,
  buildEnRouteMessage,
  buildHeadsUpMessage,
  buildQuoteIntro,
  buildScheduleConfirmationMessage,
  frequencyLabel,
  getTranslation,
  jobStatusLabel,
  leadStageLabel,
  quoteFallbackRecipient,
  quoteFallbackZone,
  quoteIncludesLabel,
  quoteInvoicePrompt,
  quoteNoExtrasLabel,
  quotePaymentPrompt,
  scheduleInvoiceLabel,
  unitLabel,
} from './src/i18n'
import { merchantProfile } from './src/merchant'

const palette = {
  canvas: '#f4f2eb',
  card: '#fbfaf6',
  cardAlt: '#f3efe3',
  ink: '#17211b',
  muted: '#566257',
  subtle: '#738171',
  line: '#ddd8cb',
  green: '#195847',
  greenSoft: '#d9ece6',
  amber: '#9a5c0f',
  amberSoft: '#f3e2cb',
  red: '#a54034',
  redSoft: '#f5dbd8',
  blue: '#3c6e84',
  blueSoft: '#dbeaf0',
  white: '#ffffff',
  black: '#0e1512',
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

const taskOrder: TaskKey[] = [
  'llegada',
  'fotoAntes',
  'trabajo',
  'fotoDespues',
  'cobro',
]

const frequencyDiscount: Record<Frequency, number> = {
  semanal: -0.11,
  quincenal: -0.05,
  mensual: 0,
}

const visitsPerMonth: Record<Frequency, number> = {
  semanal: 4,
  quincenal: 2,
  mensual: 1,
}

const quickTimeSlots = ['07:30', '09:00', '11:30', '14:00', '16:30']

const leadStages: Array<LeadStage | 'todas'> = [
  'todas',
  'nuevo',
  'visita',
  'propuesta',
  'anticipo',
]

function formatCurrency(value: number) {
  return currency.format(Math.round(value))
}

function formatNumber(value: number) {
  return value.toLocaleString('es-MX')
}

function buildInitialJobStatuses() {
  return jobs.reduce<Record<string, JobStatus>>((accumulator, job) => {
    accumulator[job.id] = job.status
    return accumulator
  }, {})
}

function buildInitialChecklists() {
  return jobs.reduce<Record<string, Record<TaskKey, boolean>>>((accumulator, job) => {
    const checklistState = taskOrder.reduce<Record<TaskKey, boolean>>(
      (taskAccumulator, task, index) => {
        taskAccumulator[task] = index < job.checklistDone
        return taskAccumulator
      },
      {
        llegada: false,
        fotoAntes: false,
        trabajo: false,
        fotoDespues: false,
        cobro: false,
      },
    )
    accumulator[job.id] = checklistState
    return accumulator
  }, {})
}

function buildInitialPhotoCounts() {
  return jobs.reduce<Record<string, { before: number; after: number }>>(
    (accumulator, job) => {
      accumulator[job.id] = {
        before: job.beforePhotos,
        after: job.afterPhotos,
      }
      return accumulator
    },
    {},
  )
}

function getToneForStatus(status: JobStatus) {
  switch (status) {
    case 'en-ruta':
      return 'blue'
    case 'trabajando':
      return 'green'
    case 'pendiente-cobro':
      return 'amber'
    case 'cerrado':
      return 'neutral'
  }
}

function getToneForRisk(risk: CollectionItem['risk']) {
  switch (risk) {
    case 'alta':
      return 'red'
    case 'media':
      return 'amber'
    case 'baja':
      return 'green'
  }
}

function getToneForScheduleStatus(status: ScheduleSlot['status']) {
  switch (status) {
    case 'confirmado':
      return 'green'
    case 'por-confirmar':
      return 'blue'
    case 'reprogramar':
      return 'amber'
  }
}

function getToneForTrackingStatus(status: (typeof trackingPings)[number]['status']) {
  switch (status) {
    case 'normal':
      return 'green'
    case 'retraso':
      return 'amber'
    case 'desvio':
      return 'red'
  }
}

function inferServiceType(source: string): ServiceType {
  const lower = source.toLowerCase()
  if (lower.includes('poda') || lower.includes('prun')) return 'poda'
  if (
    lower.includes('riego') ||
    lower.includes('grava') ||
    lower.includes('diseno') ||
    lower.includes('irrigation') ||
    lower.includes('gravel') ||
    lower.includes('design') ||
    lower.includes('landscap')
  ) {
    return 'paisajismo'
  }
  return 'mantenimiento'
}

function TonePill({
  label,
  tone,
}: {
  label: string
  tone: 'green' | 'amber' | 'red' | 'blue' | 'neutral'
}) {
  const toneStyle =
    tone === 'green'
      ? styles.pillGreen
      : tone === 'amber'
        ? styles.pillAmber
        : tone === 'red'
          ? styles.pillRed
          : tone === 'blue'
            ? styles.pillBlue
            : styles.pillNeutral

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  )
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  )
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentProps<typeof Feather>['name']
  label: string
  value: string
  detail: string
  tone: 'green' | 'amber' | 'red' | 'blue'
}) {
  const toneContainer =
    tone === 'green'
      ? styles.metricIconGreen
      : tone === 'amber'
        ? styles.metricIconAmber
        : tone === 'red'
          ? styles.metricIconRed
          : styles.metricIconBlue

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, toneContainer]}>
        <Feather name={icon} size={16} color={palette.ink} />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  )
}

function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%` }]} />
    </View>
  )
}

export default function App() {
  const [language, setLanguage] = useState<Language>('es')
  const [tab, setTab] = useState<TabId>('hoy')
  const [crewMode, setCrewMode] = useState(false)
  const [demoMode, setDemoMode] = useState(false)
  const [selectedCrew, setSelectedCrew] = useState<string>('all')
  const [selectedJobId, setSelectedJobId] = useState(jobs[1].id)
  const [clientName, setClientName] = useState('')
  const [clientNeighborhood, setClientNeighborhood] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('mantenimiento')
  const [frequency, setFrequency] = useState<Frequency>('quincenal')
  const [zone, setZone] = useState<Zone>('residencial')
  const [area, setArea] = useState(240)
  const [requiresInvoice, setRequiresInvoice] = useState(false)
  const [selectedExtras, setSelectedExtras] = useState<string[]>([
    'deshierbe',
    'retiro',
  ])
  const [quoteCustomSpanish, setQuoteCustomSpanish] = useState('')
  const [quoteCustomEnglish, setQuoteCustomEnglish] = useState('')
  const [dictatingSpanish, setDictatingSpanish] = useState(false)
  const [leadFilter, setLeadFilter] = useState<LeadStage | 'todas'>('todas')
  const [invoiceOnly, setInvoiceOnly] = useState(false)
  const [selectedDayId, setSelectedDayId] = useState(calendarDays[0].id)
  const [scheduleClient, setScheduleClient] = useState('')
  const [scheduleServiceType, setScheduleServiceType] =
    useState<ServiceType>('mantenimiento')
  const [scheduleCrewId, setScheduleCrewId] = useState(crews[0].id)
  const [scheduleTime, setScheduleTime] = useState(quickTimeSlots[2])
  const [scheduleRecurring, setScheduleRecurring] = useState(true)
  const [scheduleFrequency, setScheduleFrequency] =
    useState<Frequency>('semanal')
  const [scheduledSlots, setScheduledSlots] = useState(scheduleSlots)
  const [planItems, setPlanItems] = useState(recurringPlans)
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>(
    buildInitialJobStatuses,
  )
  const [checklists, setChecklists] = useState<
    Record<string, Record<TaskKey, boolean>>
  >(buildInitialChecklists)
  const [photoCounts, setPhotoCounts] = useState<
    Record<string, { before: number; after: number }>
  >(buildInitialPhotoCounts)

  const resetMutableData = () => {
    setJobStatuses(buildInitialJobStatuses())
    setChecklists(buildInitialChecklists())
    setPhotoCounts(buildInitialPhotoCounts())
    setScheduledSlots(scheduleSlots)
    setPlanItems(recurringPlans)
  }

  const applyDemoPreset = () => {
    resetMutableData()
    setCrewMode(false)
    setSelectedCrew('all')
    setSelectedJobId(jobs[0].id)
    setClientName('Casa Garza')
    setClientNeighborhood('San Jeronimo')
    setServiceType('mantenimiento')
    setFrequency('semanal')
    setZone('residencial')
    setArea(320)
    setRequiresInvoice(false)
    setSelectedExtras(['deshierbe', 'riego'])
    setQuoteCustomSpanish(
      'Puedo pasar manana entre 9 y 11 am y mandar evidencia por WhatsApp.',
    )
    setQuoteCustomEnglish(
      'I can come by tomorrow between 9 and 11 am and send photo proof on WhatsApp.',
    )
    setLeadFilter('nuevo')
    setInvoiceOnly(false)
    setSelectedDayId(calendarDays[0].id)
    setScheduleClient('Casa Garza')
    setScheduleServiceType('mantenimiento')
    setScheduleCrewId(crews[0].id)
    setScheduleTime(quickTimeSlots[1])
    setScheduleRecurring(true)
    setScheduleFrequency('semanal')
  }

  const clearDemoPreset = () => {
    resetMutableData()
    setCrewMode(false)
    setSelectedCrew('all')
    setSelectedJobId(jobs[1].id)
    setClientName('')
    setClientNeighborhood('')
    setServiceType('mantenimiento')
    setFrequency('quincenal')
    setZone('residencial')
    setArea(240)
    setRequiresInvoice(false)
    setSelectedExtras(['deshierbe', 'retiro'])
    setQuoteCustomSpanish('')
    setQuoteCustomEnglish('')
    setLeadFilter('todas')
    setInvoiceOnly(false)
    setSelectedDayId(calendarDays[0].id)
    setScheduleClient('')
    setScheduleServiceType('mantenimiento')
    setScheduleCrewId(crews[0].id)
    setScheduleTime(quickTimeSlots[2])
    setScheduleRecurring(true)
    setScheduleFrequency('semanal')
  }

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('preferred-language'),
      AsyncStorage.getItem('demo-mode'),
    ])
      .then(([storedLanguage, storedDemoMode]) => {
        if (storedLanguage === 'en' || storedLanguage === 'es') {
          setLanguage(storedLanguage)
        }

        if (storedDemoMode === 'true') {
          setDemoMode(true)
          applyDemoPreset()
          setTab('demo')
        }
      })
      .catch(() => undefined)
  }, [])

  useEffect(() => {
    AsyncStorage.setItem('preferred-language', language).catch(() => undefined)
  }, [language])

  useEffect(() => {
    AsyncStorage.setItem('demo-mode', demoMode ? 'true' : 'false').catch(
      () => undefined,
    )
  }, [demoMode])

  const copy = getTranslation(language)

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

  const liveJobs = useMemo<Job[]>(
    () =>
      jobs.map((job) => ({
        ...job,
        status: jobStatuses[job.id],
        checklistDone: Object.values(checklists[job.id]).filter(Boolean).length,
        beforePhotos: photoCounts[job.id].before,
        afterPhotos: photoCounts[job.id].after,
      })),
    [checklists, jobStatuses, photoCounts],
  )

  const visibleJobs = useMemo(
    () =>
      selectedCrew === 'all'
        ? liveJobs
        : liveJobs.filter((job) => job.crewId === selectedCrew),
    [liveJobs, selectedCrew],
  )

  const selectedJob =
    visibleJobs.find((job) => job.id === selectedJobId) ?? visibleJobs[0] ?? liveJobs[0]

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
    const quoteCopy = getTranslation(messageLanguage)
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
      `${quoteCopy.labels.area}: ${area} m2.`,
      `${quoteIncludesLabel(messageLanguage)}: ${translateText(
        quoteService.detail,
        messageLanguage,
      )}`,
      quoteExtras.length > 0
        ? `${quoteCopy.labels.extras}: ${quoteExtras
            .map((item) => translateText(item.label, messageLanguage).toLowerCase())
            .join(', ')}.`
        : quoteNoExtrasLabel(messageLanguage),
      `${quoteCopy.labels.total}: ${formatCurrency(quoteTotal)}.`,
      `${quoteCopy.labels.deposit}: ${formatCurrency(quoteDeposit)}.`,
      requiresInvoice
        ? quoteInvoicePrompt(messageLanguage)
        : quotePaymentPrompt(messageLanguage),
      customNote
        ? `${quoteCopy.quote.customNotePrefix}: ${customNote}.`
        : null,
      merchantProfile.quoteClosing[messageLanguage],
    ]
      .filter(Boolean)
      .join(' ')
  }

  const quoteMessage = buildQuoteMessage(language)
  const quoteMessageSpanish = buildQuoteMessage('es')
  const quoteMessageEnglish = buildQuoteMessage('en')

  const leadsVisible =
    leadFilter === 'todas' ? leads : leads.filter((lead) => lead.stage === leadFilter)

  const todayRevenue = liveJobs.reduce((sum, job) => sum + job.amount, 0)
  const activeJobs = liveJobs.filter((job) => job.status !== 'cerrado').length
  const readyToCharge = liveJobs.filter((job) => job.status === 'pendiente-cobro').length
  const evidencePending = liveJobs.filter(
    (job) => job.beforePhotos === 0 || job.afterPhotos === 0,
  ).length
  const atRiskByRain = liveJobs.filter(
    (job) => job.rainSensitive && job.status !== 'cerrado',
  ).length
  const totalCollections = collections.reduce((sum, item) => sum + item.amount, 0)
  const invoiceCollections = collections.filter((item) => item.invoice).length
  const pipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0)

  const crewFilters = ['all', ...crews.map((crew) => crew.id)]

  const stageSummary = useMemo(
    () =>
      (['nuevo', 'visita', 'propuesta', 'anticipo'] as LeadStage[]).map((stage) => ({
        stage,
        label: leadStageLabel(language, stage),
        count: leads.filter((lead) => lead.stage === stage).length,
        value: leads
          .filter((lead) => lead.stage === stage)
          .reduce((sum, lead) => sum + lead.value, 0),
      })),
    [language],
  )

  const calendarView = useMemo(
    () =>
      calendarDays.map((day) => {
        const slots = scheduledSlots.filter((slot) => slot.dayId === day.id)
        return {
          ...day,
          scheduledCount: slots.length,
          busyCrews: new Set(slots.map((slot) => slot.crewId)).size,
        }
      }),
    [scheduledSlots],
  )

  const selectedCalendarDay =
    calendarView.find((day) => day.id === selectedDayId) ?? calendarView[0]

  const selectedDayLabel = translateText(
    selectedCalendarDay?.dayLabel ?? { en: 'the selected day', es: 'el dia seleccionado' },
    language,
  )
  const scheduledDayLabel = translateText(
    selectedCalendarDay?.dayLabel ?? { en: 'the scheduled day', es: 'el dia agendado' },
    language,
  )

  const slotsForSelectedDay = useMemo(
    () =>
      scheduledSlots
        .filter((slot) => slot.dayId === selectedDayId)
        .sort((left, right) => left.time.localeCompare(right.time)),
    [scheduledSlots, selectedDayId],
  )

  const filteredCollections = invoiceOnly
    ? collections.filter((item) => item.invoice)
    : collections

  const handleDemoToggle = (nextValue: boolean) => {
    setDemoMode(nextValue)
    if (nextValue) {
      applyDemoPreset()
      setTab('demo')
      return
    }
    clearDemoPreset()
  }

  const openFeatureFromDemo = (nextTab: Exclude<TabId, 'demo'>) => {
    if (!demoMode) {
      handleDemoToggle(true)
    }
    setTab(nextTab)
  }

  const handleExtraToggle = (extraId: string) => {
    setSelectedExtras((current) =>
      current.includes(extraId)
        ? current.filter((item) => item !== extraId)
        : [...current, extraId],
    )
  }

  const handleTaskToggle = (jobId: string, task: TaskKey) => {
    setChecklists((current) => ({
      ...current,
      [jobId]: {
        ...current[jobId],
        [task]: !current[jobId][task],
      },
    }))
  }

  const handleAdvanceJob = (job: Job) => {
    const nextStatus =
      job.status === 'en-ruta'
        ? 'trabajando'
        : job.status === 'trabajando'
          ? 'pendiente-cobro'
          : job.status === 'pendiente-cobro'
            ? 'cerrado'
            : 'en-ruta'

    setJobStatuses((current) => ({
      ...current,
      [job.id]: nextStatus,
    }))

    if (nextStatus === 'cerrado') {
      setChecklists((current) => ({
        ...current,
        [job.id]: {
          ...current[job.id],
          cobro: true,
          trabajo: true,
          fotoDespues: true,
        },
      }))
    }
  }

  const handlePickPhoto = async (jobId: string, phase: 'before' | 'after') => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

    if (!permission.granted) {
      Alert.alert(copy.alerts.permissionTitle, copy.alerts.permissionText)
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsEditing: true,
    })

    if (result.canceled) {
      return
    }

    setPhotoCounts((current) => ({
      ...current,
      [jobId]: {
        ...current[jobId],
        [phase]: current[jobId][phase] + result.assets.length,
      },
    }))

    if (phase === 'before') {
      setChecklists((current) => ({
        ...current,
        [jobId]: {
          ...current[jobId],
          fotoAntes: true,
        },
      }))
    } else {
      setChecklists((current) => ({
        ...current,
        [jobId]: {
          ...current[jobId],
          fotoDespues: true,
        },
      }))
    }
  }

  const openWhatsApp = async (message: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    try {
      await Linking.openURL(url)
    } catch {
      Alert.alert(copy.alerts.whatsappTitle, copy.alerts.whatsappText)
    }
  }

  const openMaps = async (address: string) => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    try {
      await Linking.openURL(url)
    } catch {
      Alert.alert(copy.alerts.mapsTitle, copy.alerts.mapsText)
    }
  }

  const shareQuote = async () => {
    await Share.share({ message: quoteMessage })
  }

  const copyQuoteMessage = async (
    message: string,
    messageLanguage: 'es' | 'en',
  ) => {
    await Clipboard.setStringAsync(message)
    Alert.alert(
      copy.alerts.clipboardTitle,
      messageLanguage === 'es'
        ? copy.alerts.clipboardSpanishText
        : copy.alerts.clipboardEnglishText,
    )
  }

  const startSpanishDictation = async () => {
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      Alert.alert(
        copy.alerts.speechUnavailableTitle,
        copy.alerts.speechUnavailableText,
      )
      return
    }

    const supportsOnDeviceRecognition =
      ExpoSpeechRecognitionModule.supportsOnDeviceRecognition()

    const permission = supportsOnDeviceRecognition
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
      requiresOnDeviceRecognition: supportsOnDeviceRecognition,
    })
  }

  const stopSpanishDictation = () => {
    ExpoSpeechRecognitionModule.stop()
  }

  const handleCreateSchedule = () => {
    if (!scheduleClient.trim()) {
      Alert.alert(copy.agenda.missingClientTitle, copy.agenda.missingClientText)
      return
    }

    const service = serviceDefinitions.find((item) => item.id === scheduleServiceType)!
    const recurringAmount =
      scheduleServiceType === 'mantenimiento'
        ? Math.round(service.base * visitsPerMonth[scheduleFrequency])
        : Math.round(service.base)
    const newSlot: ScheduleSlot = {
      id: `slot-${Date.now()}`,
      client: scheduleClient.trim(),
      service: service.label,
      crewId: scheduleCrewId,
      dayId: selectedDayId,
      time: scheduleTime,
      duration:
        scheduleServiceType === 'paisajismo'
          ? '4 h'
          : scheduleServiceType === 'poda'
            ? '3 h'
            : '2 h',
      status: 'confirmado',
      recurring: scheduleRecurring
        ? {
            en: frequencyLabel('en', scheduleFrequency),
            es: frequencyLabel('es', scheduleFrequency),
          }
        : undefined,
      invoice: requiresInvoice,
      note: scheduleRecurring
        ? {
            en: `${frequencyLabel('en', scheduleFrequency)} plan created from mobile scheduling.`,
            es: `Plan ${frequencyLabel('es', scheduleFrequency).toLowerCase()} generado desde agenda movil.`,
          }
        : {
            en: 'Manual entry created from mobile scheduling.',
            es: 'Alta manual desde agenda movil.',
          },
    }

    setScheduledSlots((current) => [newSlot, ...current])

    if (scheduleRecurring) {
      setPlanItems((current) => [
        {
          id: `plan-${Date.now()}`,
          client: scheduleClient.trim(),
          service: service.label,
          frequency: scheduleFrequency,
          window: {
            en: `${translateText(selectedCalendarDay?.shortLabel ?? { en: 'Mon', es: 'Lun' }, 'en')} ${scheduleTime}`,
            es: `${translateText(selectedCalendarDay?.shortLabel ?? { en: 'Mon', es: 'Lun' }, 'es')} ${scheduleTime}`,
          },
          dayLabel: selectedCalendarDay?.dayLabel ?? { en: 'Current week', es: 'Semana actual' },
          amount: recurringAmount,
          autopilot: true,
        },
        ...current,
      ])
    }

    Alert.alert(
      copy.agenda.slotBookedTitle,
      buildBookedMessage(language, scheduleClient.trim(), selectedDayLabel, scheduleTime),
    )
  }

  const handleMoveSchedule = (slotId: string) => {
    setScheduledSlots((current) =>
      current.map((slot) => {
        if (slot.id !== slotId) return slot
        const index = calendarDays.findIndex((day) => day.id === slot.dayId)
        const nextDay = calendarDays[(index + 1) % calendarDays.length]
        return {
          ...slot,
          dayId: nextDay.id,
          status: 'confirmado',
          note: {
            en: `${translateText(slot.note, 'en')} Rescheduled to ${translateText(nextDay.dayLabel, 'en')}.`,
            es: `${translateText(slot.note, 'es')} Reprogramado a ${translateText(nextDay.dayLabel, 'es')}.`,
          },
        }
      }),
    )
  }

  const handleConfirmSchedule = (slotId: string) => {
    setScheduledSlots((current) =>
      current.map((slot) =>
        slot.id === slotId ? { ...slot, status: 'confirmado' } : slot,
      ),
    )
  }

  const handlePlanAutopilot = (planId: string) => {
    setPlanItems((current) =>
      current.map((plan) =>
        plan.id === planId ? { ...plan, autopilot: !plan.autopilot } : plan,
      ),
    )
  }

  const jumpLeadToQuote = (lead: Lead) => {
    setClientName(lead.client)
    setClientNeighborhood(lead.neighborhood)
    setServiceType(inferServiceType(translateText(lead.service, language)))
    setTab('cotizar')
  }

  const renderToday = () => (
    <>
      <SectionCard
        title={copy.sections.todayTitle}
        subtitle={
          crewMode ? copy.sections.todaySubtitleCrew : copy.sections.todaySubtitleOwner
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Feather name="cloud-rain" size={16} color={palette.green} />
            <Text style={styles.heroBadgeText}>
              {copy.today.heroBadge} {rainAlert.probability}
            </Text>
          </View>
          <Text style={styles.heroTitle}>
            {atRiskByRain} {copy.today.heroTitlePrefix} {rainAlert.window}.
          </Text>
          <Text style={styles.heroText}>{translateText(rainAlert.message, language)}</Text>
          <View style={styles.heroActions}>
            <Pressable style={styles.primaryAction} onPress={() => setTab('trabajos')}>
              <Feather name="navigation" size={16} color={palette.white} />
              <Text style={styles.primaryActionText}>{copy.today.moveRoute}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryAction}
              onPress={() => openWhatsApp(translateText(quickTemplates.reminder, language))}
            >
              <Feather name="message-circle" size={16} color={palette.ink} />
              <Text style={styles.secondaryActionText}>{copy.today.notifyClients}</Text>
            </Pressable>
          </View>
        </View>
      </SectionCard>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.metricRow}
      >
        <MetricCard
          icon="dollar-sign"
          label={copy.today.scheduledRevenue}
          value={formatCurrency(todayRevenue)}
          detail={`${activeJobs} ${copy.today.activeServicesSuffix}`}
          tone="green"
        />
        <MetricCard
          icon="camera"
          label={copy.today.pendingEvidence}
          value={String(evidencePending)}
          detail={copy.today.pendingEvidenceDetail}
          tone="amber"
        />
        <MetricCard
          icon="credit-card"
          label={copy.today.receivables}
          value={formatCurrency(totalCollections)}
          detail={`${invoiceCollections} ${copy.today.receivablesDetailSuffix}`}
          tone="red"
        />
        <MetricCard
          icon="users"
          label={copy.today.openPipeline}
          value={formatCurrency(pipelineValue)}
          detail={`${leads.length} ${copy.today.opportunitiesSuffix}`}
          tone="blue"
        />
      </ScrollView>

      <SectionCard
        title={copy.sections.quickActionsTitle}
        subtitle={copy.sections.quickActionsSubtitle}
      >
        <View style={styles.quickGrid}>
          <Pressable style={styles.quickTile} onPress={() => setTab('trabajos')}>
            <Feather name="play-circle" size={18} color={palette.green} />
            <Text style={styles.quickTitle}>{copy.today.startJob}</Text>
            <Text style={styles.quickText}>{copy.today.startJobDetail}</Text>
          </Pressable>
          <Pressable style={styles.quickTile} onPress={() => setTab('cotizar')}>
            <Feather name="edit-3" size={18} color={palette.green} />
            <Text style={styles.quickTitle}>{copy.today.quoteOnSite}</Text>
            <Text style={styles.quickText}>{copy.today.quoteOnSiteDetail}</Text>
          </Pressable>
          <Pressable
            style={styles.quickTile}
            onPress={() => openWhatsApp(translateText(quickTemplates.followUp, language))}
          >
            <Feather name="send" size={18} color={palette.green} />
            <Text style={styles.quickTitle}>{copy.today.followup}</Text>
            <Text style={styles.quickText}>{copy.today.followupDetail}</Text>
          </Pressable>
          <Pressable style={styles.quickTile} onPress={() => setTab('cobranza')}>
            <Feather name="check-circle" size={18} color={palette.green} />
            <Text style={styles.quickTitle}>{copy.today.closePayment}</Text>
            <Text style={styles.quickText}>
              {readyToCharge} {copy.today.closePaymentDetailSuffix}
            </Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard
        title={copy.sections.trackingTitle}
        subtitle={copy.sections.trackingSubtitle}
      >
        {trackingPings.map((ping) => {
          const crew = crews.find((item) => item.id === ping.crewId)
          if (!crew) return null

          return (
            <View key={`tracking-${ping.crewId}`} style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={styles.listHeaderMain}>
                  <Text style={styles.listTitle}>{crew.name}</Text>
                  <Text style={styles.listSubtitle}>
                    {ping.location} · {translateText(ping.updatedAt, language)}
                  </Text>
                </View>
                <TonePill
                  label={copy.statuses.tracking[ping.status]}
                  tone={getToneForTrackingStatus(ping.status)}
                />
              </View>
              <ProgressBar value={(ping.completedStops / ping.totalStops) * 100} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.tracking}</Text>
                <Text style={styles.infoValue}>
                  {ping.completedStops}/{ping.totalStops} {copy.today.routeStops}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.eta}</Text>
                <Text style={styles.infoValue}>{translateText(ping.eta, language)}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.speed}</Text>
                <Text style={styles.infoValue}>{ping.speed}</Text>
              </View>
            </View>
          )
        })}

        <Text style={styles.subsectionLabel}>{copy.sections.capacityTitle}</Text>
        {crews.map((crew) => (
          <View key={crew.id} style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderMain}>
                <Text style={styles.listTitle}>{crew.name}</Text>
                <Text style={styles.listSubtitle}>
                  {crew.lead} · {crew.members} {unitLabel(language, 'people')}
                </Text>
              </View>
              <TonePill label={`${crew.progress}%`} tone="blue" />
            </View>
            <ProgressBar value={crew.progress} />
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.route}</Text>
              <Text style={styles.infoValue}>{translateText(crew.route, language)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.nextStop}</Text>
              <Text style={styles.infoValue}>
                {crew.nextStop} · {crew.eta}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.fuel}</Text>
              <Text style={styles.infoValue}>{crew.fuel}%</Text>
            </View>
            <Text style={styles.footnote}>{translateText(crew.equipment, language)}</Text>
          </View>
        ))}
      </SectionCard>
    </>
  )

  const renderAgenda = () => (
    <>
      <SectionCard
        title={copy.sections.agendaTitle}
        subtitle={copy.sections.agendaSubtitle}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricRow}
        >
          {calendarView.map((day) => {
            const active = day.id === selectedDayId
            return (
              <Pressable
                key={day.id}
                style={[styles.calendarDayCard, active && styles.calendarDayCardActive]}
                onPress={() => setSelectedDayId(day.id)}
              >
                <Text
                  style={[
                    styles.calendarDayShort,
                    active && styles.calendarDayShortActive,
                  ]}
                >
                  {translateText(day.shortLabel, language)}
                </Text>
                <Text
                  style={[
                    styles.calendarDayDate,
                    active && styles.calendarDayDateActive,
                  ]}
                >
                  {translateText(day.dateLabel, language)}
                </Text>
                <Text
                  style={[
                    styles.calendarDayMeta,
                    active && styles.calendarDayMetaActive,
                  ]}
                >
                  {day.scheduledCount} {unitLabel(language, 'slots')}
                </Text>
                <Text
                  style={[
                    styles.calendarDayMeta,
                    active && styles.calendarDayMetaActive,
                  ]}
                >
                  {day.busyCrews} {unitLabel(language, 'crews')}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.agendaSummary}>
          <View>
            <Text style={styles.listTitle}>
              {selectedCalendarDay
                ? translateText(selectedCalendarDay.dayLabel, language)
                : ''}
            </Text>
            <Text style={styles.listSubtitle}>
              {selectedCalendarDay
                ? translateText(selectedCalendarDay.dateLabel, language)
                : ''}
            </Text>
          </View>
          <TonePill
            label={
              selectedCalendarDay
                ? translateText(selectedCalendarDay.weather, language)
                : copy.labels.weather
            }
            tone="blue"
          />
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{copy.labels.visibleShifts}</Text>
          <Text style={styles.infoValue}>{slotsForSelectedDay.length}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>{copy.labels.busyCrews}</Text>
          <Text style={styles.infoValue}>{selectedCalendarDay?.busyCrews ?? 0}</Text>
        </View>
      </SectionCard>

      <SectionCard
        title={copy.sections.quickScheduleTitle}
        subtitle={copy.sections.quickScheduleSubtitle}
      >
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{copy.labels.client}</Text>
          <TextInput
            style={styles.textInput}
            value={scheduleClient}
            onChangeText={setScheduleClient}
            placeholder={copy.quote.customerPlaceholder}
            placeholderTextColor={palette.subtle}
          />
        </View>

        <Text style={styles.subsectionLabel}>{copy.labels.service}</Text>
        <View style={styles.segmentedRow}>
          {serviceDefinitions.map((item) => {
            const active = scheduleServiceType === item.id
            return (
              <Pressable
                key={`schedule-${item.id}`}
                style={[styles.segmentButton, active && styles.segmentButtonActive]}
                onPress={() => setScheduleServiceType(item.id)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    active && styles.segmentButtonTextActive,
                  ]}
                >
                  {translateText(item.label, language)}
                </Text>
              </Pressable>
            )
          })}
        </View>

        <Text style={styles.subsectionLabel}>{copy.labels.crew}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {crews.map((crew) => {
            const active = scheduleCrewId === crew.id
            return (
              <Pressable
                key={`crew-${crew.id}`}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setScheduleCrewId(crew.id)}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {crew.name}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <Text style={styles.subsectionLabel}>{copy.labels.suggestedTime}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {quickTimeSlots.map((slot) => {
            const active = scheduleTime === slot
            return (
              <Pressable
                key={slot}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setScheduleTime(slot)}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {slot}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchTitle}>{copy.switches.recurringTitle}</Text>
            <Text style={styles.switchDetail}>
              {copy.switches.recurringDetail}
            </Text>
          </View>
          <Switch
            value={scheduleRecurring}
            onValueChange={setScheduleRecurring}
            trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
            thumbColor={palette.white}
          />
        </View>

        {scheduleRecurring ? (
          <View style={styles.segmentedRow}>
            {(['semanal', 'quincenal', 'mensual'] as Frequency[]).map((item) => {
              const active = scheduleFrequency === item
              return (
                <Pressable
                  key={`schedule-frequency-${item}`}
                  style={[styles.segmentButton, active && styles.segmentButtonActive]}
                  onPress={() => setScheduleFrequency(item)}
                >
                  <Text
                    style={[
                      styles.segmentButtonText,
                      active && styles.segmentButtonTextActive,
                    ]}
                  >
                    {frequencyLabel(language, item)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        ) : null}

        <View style={styles.switchRowCompact}>
          <Text style={styles.switchInlineText}>{copy.labels.clientWithInvoice}</Text>
          <Switch
            value={requiresInvoice}
            onValueChange={setRequiresInvoice}
            trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
            thumbColor={palette.white}
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryAction} onPress={handleCreateSchedule}>
            <Feather name="calendar" size={16} color={palette.white} />
            <Text style={styles.primaryActionText}>{copy.agenda.bookSlot}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryAction}
            onPress={() =>
              openWhatsApp(
                buildHeadsUpMessage(language, scheduleClient, selectedDayLabel, scheduleTime),
              )
            }
          >
            <Feather name="message-circle" size={16} color={palette.ink} />
            <Text style={styles.secondaryActionText}>{copy.agenda.headsUp}</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard
        title={`${copy.sections.daySlotsPrefix} ${translateText(
          selectedCalendarDay?.dayLabel ?? { en: 'the schedule', es: 'la agenda' },
          language,
        )}`}
        subtitle={copy.sections.daySlotsSubtitle}
      >
        {slotsForSelectedDay.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={20} color={palette.subtle} />
            <Text style={styles.emptyStateTitle}>{copy.agenda.noSlotsTitle}</Text>
            <Text style={styles.emptyStateText}>{copy.agenda.noSlotsText}</Text>
          </View>
        ) : null}

        {slotsForSelectedDay.map((slot) => {
          const crew = crews.find((item) => item.id === slot.crewId)
          return (
            <View key={slot.id} style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={styles.listHeaderMain}>
                  <Text style={styles.listTitle}>{slot.client}</Text>
                  <Text style={styles.listSubtitle}>
                    {slot.time} · {slot.duration} · {translateText(slot.service, language)}
                  </Text>
                </View>
                <TonePill
                  label={copy.statuses.schedule[slot.status]}
                  tone={getToneForScheduleStatus(slot.status)}
                />
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.crew}</Text>
                <Text style={styles.infoValue}>{crew?.name ?? slot.crewId}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.recurrence}</Text>
                <Text style={styles.infoValue}>
                  {slot.recurring
                    ? translateText(slot.recurring, language)
                    : copy.agenda.uniqueService}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.invoice}</Text>
                <Text style={styles.infoValue}>{scheduleInvoiceLabel(language, slot.invoice)}</Text>
              </View>
              <Text style={styles.footnote}>{translateText(slot.note, language)}</Text>
              <View style={styles.actionRow}>
                {slot.status !== 'confirmado' ? (
                  <Pressable
                    style={styles.smallAction}
                    onPress={() => handleConfirmSchedule(slot.id)}
                  >
                    <Feather name="check-circle" size={14} color={palette.ink} />
                    <Text style={styles.smallActionText}>{copy.agenda.confirm}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.smallAction}
                  onPress={() => handleMoveSchedule(slot.id)}
                >
                  <Feather name="skip-forward" size={14} color={palette.ink} />
                  <Text style={styles.smallActionText}>{copy.agenda.moveNextDay}</Text>
                </Pressable>
                <Pressable
                  style={styles.smallAction}
                  onPress={() =>
                    openWhatsApp(
                      buildScheduleConfirmationMessage(
                        language,
                        slot.client,
                        translateText(slot.service, language),
                        scheduledDayLabel,
                        slot.time,
                      ),
                    )
                  }
                >
                  <Feather name="message-circle" size={14} color={palette.ink} />
                  <Text style={styles.smallActionText}>{copy.agenda.notify}</Text>
                </Pressable>
              </View>
            </View>
          )
        })}
      </SectionCard>

      <SectionCard
        title={copy.sections.recurringTitle}
        subtitle={copy.sections.recurringSubtitle}
      >
        {planItems.map((plan) => (
          <View key={plan.id} style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderMain}>
                <Text style={styles.listTitle}>{plan.client}</Text>
                <Text style={styles.listSubtitle}>
                  {translateText(plan.service, language)} · {translateText(plan.dayLabel, language)}
                </Text>
              </View>
              <TonePill
                label={plan.autopilot ? copy.agenda.autoSchedule : copy.agenda.manualSchedule}
                tone={plan.autopilot ? 'green' : 'amber'}
              />
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.frequency}</Text>
              <Text style={styles.infoValue}>{frequencyLabel(language, plan.frequency)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.window}</Text>
              <Text style={styles.infoValue}>{translateText(plan.window, language)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.income}</Text>
              <Text style={styles.infoValue}>{formatCurrency(plan.amount)}</Text>
            </View>
            <View style={styles.switchRowCompact}>
              <Text style={styles.switchInlineText}>{copy.switches.futureVisits}</Text>
              <Switch
                value={plan.autopilot}
                onValueChange={() => handlePlanAutopilot(plan.id)}
                trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
                thumbColor={palette.white}
              />
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  )

  const renderJobs = () => (
    <>
      <SectionCard
        title={copy.sections.jobsTitle}
        subtitle={copy.sections.jobsSubtitle}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {crewFilters.map((crewFilter) => {
            const active = selectedCrew === crewFilter
            const label =
              crewFilter === 'all'
                ? allLabel(language)
                : crews.find((crew) => crew.id === crewFilter)?.name ?? crewFilter

            return (
              <Pressable
                key={crewFilter}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setSelectedCrew(crewFilter)}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {visibleJobs.map((job) => {
          const expanded = selectedJob?.id === job.id
          const crewName = crews.find((crew) => crew.id === job.crewId)?.name ?? job.crewId
          const nextActionLabel =
            job.status === 'en-ruta'
              ? copy.jobs.startService
              : job.status === 'trabajando'
                ? copy.jobs.readyForPayment
                : job.status === 'pendiente-cobro'
                  ? copy.jobs.closeService
                  : copy.jobs.reopen

          return (
            <Pressable
              key={job.id}
              style={[styles.jobCard, expanded && styles.jobCardActive]}
              onPress={() => setSelectedJobId(job.id)}
            >
              <View style={styles.listHeader}>
                <View style={styles.listHeaderMain}>
                  <Text style={styles.listTitle}>{job.client}</Text>
                  <Text style={styles.listSubtitle}>
                    {job.time} · {translateText(job.service, language)}
                  </Text>
                </View>
                <TonePill
                  label={jobStatusLabel(language, job.status)}
                  tone={getToneForStatus(job.status)}
                />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.location}</Text>
                <Text style={styles.infoValue}>{job.address}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.crew}</Text>
                <Text style={styles.infoValue}>{crewName}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.ticket}</Text>
                <Text style={styles.infoValue}>
                  {formatCurrency(job.amount)} · {copy.statuses.payment[job.payment]}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{copy.labels.checklist}</Text>
                <Text style={styles.infoValue}>
                  {job.checklistDone}/{job.checklistTotal}
                </Text>
              </View>
              <View style={styles.photoStatRow}>
                <View style={styles.photoMini}>
                  <Feather name="image" size={14} color={palette.muted} />
                  <Text style={styles.photoMiniText}>
                    {copy.jobs.before} {job.beforePhotos}
                  </Text>
                </View>
                <View style={styles.photoMini}>
                  <Feather name="image" size={14} color={palette.muted} />
                  <Text style={styles.photoMiniText}>
                    {copy.jobs.after} {job.afterPhotos}
                  </Text>
                </View>
                {job.rainSensitive ? (
                  <TonePill label={copy.labels.weatherRisk} tone="amber" />
                ) : null}
              </View>

              {expanded ? (
                <View style={styles.expandedArea}>
                  <View style={styles.actionRow}>
                    <Pressable
                      style={styles.smallAction}
                      onPress={() => openMaps(job.address)}
                    >
                      <Feather name="map-pin" size={14} color={palette.ink} />
                      <Text style={styles.smallActionText}>{copy.jobs.map}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.smallAction}
                      onPress={() =>
                        openWhatsApp(
                          buildEnRouteMessage(
                            language,
                            job.contact,
                            translateText(job.service, language),
                            job.neighborhood,
                          ),
                        )
                      }
                    >
                      <Feather name="message-circle" size={14} color={palette.ink} />
                      <Text style={styles.smallActionText}>{copy.jobs.whatsapp}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.smallAction}
                      onPress={() => handleAdvanceJob(job)}
                    >
                      <Feather name="arrow-right-circle" size={14} color={palette.ink} />
                      <Text style={styles.smallActionText}>{nextActionLabel}</Text>
                    </Pressable>
                  </View>

                  <Text style={styles.subsectionLabel}>{copy.jobs.mobileChecklist}</Text>
                  <View style={styles.checklistWrap}>
                    {taskOrder.map((task) => (
                      <Pressable
                        key={task}
                        style={[
                          styles.checkItem,
                          checklists[job.id][task] && styles.checkItemActive,
                        ]}
                        onPress={() => handleTaskToggle(job.id, task)}
                      >
                        <Feather
                          name={checklists[job.id][task] ? 'check-circle' : 'circle'}
                          size={16}
                          color={checklists[job.id][task] ? palette.green : palette.subtle}
                        />
                        <Text
                          style={[
                            styles.checkItemText,
                            checklists[job.id][task] && styles.checkItemTextActive,
                          ]}
                        >
                          {translateText(checklistLabels[task], language)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  <Text style={styles.subsectionLabel}>{copy.jobs.photoEvidence}</Text>
                  <View style={styles.photoActionRow}>
                    <Pressable
                      style={styles.photoAction}
                      onPress={() => handlePickPhoto(job.id, 'before')}
                    >
                      <Feather name="camera" size={16} color={palette.ink} />
                      <Text style={styles.photoActionTitle}>{copy.jobs.before}</Text>
                      <Text style={styles.photoActionCount}>
                        {job.beforePhotos} {copy.jobs.photos}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.photoAction}
                      onPress={() => handlePickPhoto(job.id, 'after')}
                    >
                      <Feather name="camera" size={16} color={palette.ink} />
                      <Text style={styles.photoActionTitle}>{copy.jobs.after}</Text>
                      <Text style={styles.photoActionCount}>
                        {job.afterPhotos} {copy.jobs.photos}
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.noteCard}>
                    <Text style={styles.noteTitle}>{copy.labels.note}</Text>
                    <Text style={styles.noteText}>{translateText(job.note, language)}</Text>
                    <Text style={styles.noteFoot}>
                      {copy.labels.materials}: {translateText(job.materials, language)}
                    </Text>
                  </View>
                </View>
              ) : null}
            </Pressable>
          )
        })}
      </SectionCard>
    </>
  )

  const renderQuote = () => (
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
            placeholderTextColor={palette.subtle}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{copy.labels.zone}</Text>
          <TextInput
            style={styles.textInput}
            value={clientNeighborhood}
            onChangeText={setClientNeighborhood}
            placeholder={copy.quote.neighborhoodPlaceholder}
            placeholderTextColor={palette.subtle}
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
                <Text
                  style={[styles.optionDetail, active && styles.optionDetailActive]}
                >
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
              onPress={() => setArea((current) => Math.max(80, current - 20))}
            >
              <Feather name="minus" size={18} color={palette.ink} />
            </Pressable>
            <Pressable
              style={styles.stepperButton}
              onPress={() => setArea((current) => Math.min(900, current + 20))}
            >
              <Feather name="plus" size={18} color={palette.ink} />
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
                <Text
                  style={[styles.optionDetail, active && styles.optionDetailActive]}
                >
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
                      style={[
                        styles.segmentButtonText,
                        active && styles.segmentButtonTextActive,
                      ]}
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
                  color={active ? palette.green : palette.subtle}
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
            placeholderTextColor={palette.subtle}
            multiline
            textAlignVertical="top"
          />
          <Text style={styles.footnote}>{copy.quote.spanishNoteDetail}</Text>
          <View style={styles.actionRow}>
            <Pressable
              style={styles.smallAction}
              onPress={dictatingSpanish ? stopSpanishDictation : startSpanishDictation}
            >
              <Feather
                name={dictatingSpanish ? 'square' : 'mic'}
                size={14}
                color={palette.ink}
              />
              <Text style={styles.smallActionText}>
                {dictatingSpanish
                  ? copy.quote.stopDictation
                  : copy.quote.dictateSpanish}
              </Text>
            </Pressable>
            <Pressable
              style={styles.smallAction}
              onPress={() => setQuoteCustomSpanish('')}
            >
              <Feather name="x-circle" size={14} color={palette.ink} />
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
            placeholderTextColor={palette.subtle}
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
            thumbColor={palette.white}
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
              <Feather name="message-circle" size={14} color={palette.ink} />
              <Text style={styles.smallActionText}>{copy.quote.whatsappSpanish}</Text>
            </Pressable>
            <Pressable
              style={styles.smallAction}
              onPress={() => copyQuoteMessage(quoteMessageSpanish, 'es')}
            >
              <Feather name="copy" size={14} color={palette.ink} />
              <Text style={styles.smallActionText}>{copy.quote.copySpanish}</Text>
            </Pressable>
            <Pressable
              style={styles.smallAction}
              onPress={() => copyQuoteMessage(quoteMessageEnglish, 'en')}
            >
              <Feather name="copy" size={14} color={palette.ink} />
              <Text style={styles.smallActionText}>{copy.quote.copyEnglish}</Text>
            </Pressable>
            <Pressable style={styles.smallAction} onPress={shareQuote}>
              <Feather name="share-2" size={14} color={palette.ink} />
              <Text style={styles.smallActionText}>{copy.quote.share}</Text>
            </Pressable>
          </View>
        </View>
      </SectionCard>
    </>
  )

  const renderCrm = () => (
    <>
      <SectionCard
        title={copy.sections.crmTitle}
        subtitle={copy.sections.crmSubtitle}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.metricRow}
        >
          {stageSummary.map((item) => (
            <View key={item.stage} style={styles.pipelineCard}>
              <Text style={styles.pipelineLabel}>{item.label}</Text>
              <Text style={styles.pipelineValue}>{item.count}</Text>
              <Text style={styles.pipelineAmount}>{formatCurrency(item.value)}</Text>
            </View>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {leadStages.map((stage) => {
            const active = leadFilter === stage
            return (
              <Pressable
                key={stage}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setLeadFilter(stage)}
              >
                <Text
                  style={[styles.filterChipText, active && styles.filterChipTextActive]}
                >
                  {leadStageLabel(language, stage)}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {leadsVisible.map((lead) => (
          <View key={lead.id} style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderMain}>
                <Text style={styles.listTitle}>{lead.client}</Text>
                <Text style={styles.listSubtitle}>
                  {lead.neighborhood} · {translateText(lead.source, language)}
                </Text>
              </View>
              <TonePill label={leadStageLabel(language, lead.stage)} tone="blue" />
            </View>
            <Text style={styles.crmService}>{translateText(lead.service, language)}</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.value}</Text>
              <Text style={styles.infoValue}>{formatCurrency(lead.value)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{copy.labels.nextStep}</Text>
              <Text style={styles.infoValue}>{translateText(lead.nextStep, language)}</Text>
            </View>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.smallAction}
                onPress={() =>
                  openWhatsApp(
                    buildCrmFollowUpMessage(
                      language,
                      lead.client,
                      translateText(quickTemplates.followUp, language),
                    ),
                  )
                }
              >
                <Feather name="message-circle" size={14} color={palette.ink} />
                <Text style={styles.smallActionText}>{copy.crm.respond}</Text>
              </Pressable>
              <Pressable style={styles.smallAction} onPress={() => jumpLeadToQuote(lead)}>
                <Feather name="edit-3" size={14} color={palette.ink} />
                <Text style={styles.smallActionText}>{copy.crm.buildQuote}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  )

  const renderCollections = () => (
    <>
      <SectionCard
        title={copy.sections.collectionsTitle}
        subtitle={copy.sections.collectionsSubtitle}
      >
        <View style={styles.collectionTopRow}>
          <View>
            <Text style={styles.sectionTitle}>{copy.collections.pendingToCollect}</Text>
            <Text style={styles.collectionTotal}>{formatCurrency(totalCollections)}</Text>
          </View>
          <View style={styles.switchInline}>
            <Text style={styles.switchInlineText}>{copy.collections.invoiceOnly}</Text>
            <Switch
              value={invoiceOnly}
              onValueChange={setInvoiceOnly}
              trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
              thumbColor={palette.white}
            />
          </View>
        </View>

        {filteredCollections.map((item) => (
          <View key={item.id} style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderMain}>
                <Text style={styles.listTitle}>{item.client}</Text>
                <Text style={styles.listSubtitle}>
                  {translateText(item.due, language)} · {copy.statuses.payment[item.payment]}
                </Text>
              </View>
              <TonePill label={copy.statuses.risk[item.risk]} tone={getToneForRisk(item.risk)} />
            </View>
            <Text style={styles.collectionAmount}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.footnote}>{translateText(item.note, language)}</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.smallAction}
                onPress={() =>
                  openWhatsApp(
                    buildCollectionReminderMessage(
                      language,
                      item.client,
                      translateText(quickTemplates.reminder, language),
                      formatCurrency(item.amount),
                    ),
                  )
                }
              >
                <Feather name="send" size={14} color={palette.ink} />
                <Text style={styles.smallActionText}>{copy.collections.remind}</Text>
              </Pressable>
              <Pressable
                style={styles.smallAction}
                onPress={() =>
                  Alert.alert(
                    copy.alerts.invoiceTitle,
                    item.invoice
                      ? copy.alerts.invoiceText
                      : copy.alerts.noInvoiceText,
                  )
                }
              >
                <Feather name="file-text" size={14} color={palette.ink} />
                <Text style={styles.smallActionText}>{copy.collections.invoiceChecklist}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  )

  const renderDemo = () => {
    const demoFeatures: Array<{
      id: Exclude<TabId, 'demo'>
      title: string
      subtitle: string
      metricLabel: string
      metricValue: string
      detailLabel: string
      detailValue: string
    }> = [
      {
        id: 'hoy',
        title: copy.sections.todayTitle,
        subtitle: crewMode ? copy.sections.todaySubtitleCrew : copy.sections.todaySubtitleOwner,
        metricLabel: copy.labels.income,
        metricValue: formatCurrency(todayRevenue),
        detailLabel: copy.labels.weatherRisk,
        detailValue: `${atRiskByRain}`,
      },
      {
        id: 'agenda',
        title: copy.sections.agendaTitle,
        subtitle: copy.sections.agendaSubtitle,
        metricLabel: copy.labels.visibleShifts,
        metricValue: `${slotsForSelectedDay.length}`,
        detailLabel: copy.labels.recurrence,
        detailValue: `${planItems.length}`,
      },
      {
        id: 'trabajos',
        title: copy.sections.jobsTitle,
        subtitle: copy.sections.jobsSubtitle,
        metricLabel: copy.labels.checklist,
        metricValue: `${selectedJob.checklistDone}/${selectedJob.checklistTotal}`,
        detailLabel: copy.today.pendingEvidence,
        detailValue: `${evidencePending}`,
      },
      {
        id: 'cotizar',
        title: copy.sections.quoteTitle,
        subtitle: copy.sections.quoteSubtitle,
        metricLabel: copy.labels.total,
        metricValue: formatCurrency(quoteTotal),
        detailLabel: copy.quote.whatsappSpanish,
        detailValue: copy.quote.copyEnglish,
      },
      {
        id: 'crm',
        title: copy.sections.crmTitle,
        subtitle: copy.sections.crmSubtitle,
        metricLabel: copy.labels.value,
        metricValue: formatCurrency(pipelineValue),
        detailLabel: copy.today.openPipeline,
        detailValue: `${leadsVisible.length}`,
      },
      {
        id: 'cobranza',
        title: copy.sections.collectionsTitle,
        subtitle: copy.sections.collectionsSubtitle,
        metricLabel: copy.collections.pendingToCollect,
        metricValue: formatCurrency(totalCollections),
        detailLabel: copy.labels.invoice,
        detailValue: `${invoiceCollections}`,
      },
    ]

    return (
      <>
        <SectionCard title={copy.demo.title} subtitle={copy.demo.subtitle}>
          <Text style={styles.footnote}>{copy.demo.note}</Text>
          <View style={styles.actionRow}>
            <TonePill
              label={demoMode ? copy.demo.loaded : copy.demo.enable}
              tone={demoMode ? 'green' : 'amber'}
            />
          </View>
        </SectionCard>

        <SectionCard
          title={copy.demo.walkthroughTitle}
          subtitle={copy.demo.walkthroughSubtitle}
        >
          {demoFeatures.map((feature) => (
            <View key={feature.id} style={styles.listCard}>
              <View style={styles.listHeader}>
                <View style={styles.listHeaderMain}>
                  <Text style={styles.listTitle}>{feature.title}</Text>
                  <Text style={styles.listSubtitle}>{feature.subtitle}</Text>
                </View>
                <TonePill
                  label={translateText(
                    tabs.find((item) => item.id === feature.id)!.label,
                    language,
                  )}
                  tone="blue"
                />
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{feature.metricLabel}</Text>
                <Text style={styles.infoValue}>{feature.metricValue}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{feature.detailLabel}</Text>
                <Text style={styles.infoValue}>{feature.detailValue}</Text>
              </View>
              <Pressable
                style={styles.smallAction}
                onPress={() => openFeatureFromDemo(feature.id)}
              >
                <Feather name="arrow-right-circle" size={14} color={palette.ink} />
                <Text style={styles.smallActionText}>
                  {translateText(
                    tabs.find((item) => item.id === feature.id)!.label,
                    language,
                  )}
                </Text>
              </Pressable>
            </View>
          ))}
        </SectionCard>
      </>
    )
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.appShell}>
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <View style={styles.brandIcon}>
                <Feather name="feather" size={16} color={palette.green} />
              </View>
              <View style={styles.brandText}>
                <Text style={styles.brandEyebrow}>{merchantProfile.ownerLine[language]}</Text>
                <Text style={styles.brandTitle}>{merchantProfile.appName}</Text>
              </View>
            </View>

            <View style={styles.headerControls}>
              <View style={styles.languageToggle}>
                <Text style={styles.modeLabel}>{copy.app.language}</Text>
                <View style={styles.segmentedSmall}>
                  <Pressable
                    style={[
                      styles.segmentMini,
                      language === 'es' && styles.segmentMiniActive,
                    ]}
                    onPress={() => setLanguage('es')}
                  >
                    <Text
                      style={[
                        styles.segmentMiniText,
                        language === 'es' && styles.segmentMiniTextActive,
                      ]}
                    >
                      {copy.app.spanish}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.segmentMini,
                      language === 'en' && styles.segmentMiniActive,
                    ]}
                    onPress={() => setLanguage('en')}
                  >
                    <Text
                      style={[
                        styles.segmentMiniText,
                        language === 'en' && styles.segmentMiniTextActive,
                      ]}
                    >
                      {copy.app.english}
                    </Text>
                  </Pressable>
                </View>
              </View>

              <View style={styles.modeSwitch}>
                <Text style={styles.modeLabel}>{copy.app.demoLabel}</Text>
                <Switch
                  value={demoMode}
                  onValueChange={handleDemoToggle}
                  trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
                  thumbColor={palette.white}
                />
              </View>

              <View style={styles.modeSwitch}>
                <Text style={styles.modeLabel}>{copy.app.modeLabel}</Text>
                <Switch
                  value={crewMode}
                  onValueChange={setCrewMode}
                  trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
                  thumbColor={palette.white}
                />
              </View>
            </View>
          </View>

          <View style={styles.syncBar}>
            <TonePill label={copy.app.syncLabel} tone="green" />
            <TonePill label={copy.app.offlineLabel} tone="neutral" />
            <TonePill label={copy.app.nativeOnlyLabel} tone="blue" />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {tab === 'demo' ? renderDemo() : null}
            {tab === 'hoy' ? renderToday() : null}
            {tab === 'agenda' ? renderAgenda() : null}
            {tab === 'trabajos' ? renderJobs() : null}
            {tab === 'cotizar' ? renderQuote() : null}
            {tab === 'crm' ? renderCrm() : null}
            {tab === 'cobranza' ? renderCollections() : null}
          </ScrollView>

          <View style={styles.tabBar}>
            {tabs.map((item) => {
              const active = tab === item.id
              return (
                <Pressable
                  key={item.id}
                  style={styles.tabButton}
                  onPress={() => setTab(item.id)}
                >
                  <View style={[styles.tabIconWrap, active && styles.tabIconWrapActive]}>
                    <Feather
                      name={item.icon as ComponentProps<typeof Feather>['name']}
                      size={18}
                      color={active ? palette.green : palette.subtle}
                    />
                  </View>
                  <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                    {translateText(item.label, language)}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  appShell: {
    flex: 1,
    backgroundColor: palette.canvas,
  },
  topBar: {
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    flex: 1,
  },
  headerControls: {
    alignItems: 'flex-end',
    gap: 8,
  },
  brandEyebrow: {
    color: palette.subtle,
    fontSize: 12,
    marginBottom: 2,
  },
  brandTitle: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  modeSwitch: {
    alignItems: 'center',
    gap: 6,
  },
  languageToggle: {
    alignItems: 'center',
    gap: 6,
  },
  modeLabel: {
    color: palette.subtle,
    fontSize: 11,
  },
  segmentedSmall: {
    flexDirection: 'row',
    backgroundColor: palette.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 3,
    gap: 4,
  },
  segmentMini: {
    minHeight: 28,
    minWidth: 38,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentMiniActive: {
    backgroundColor: palette.green,
  },
  segmentMiniText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  segmentMiniTextActive: {
    color: palette.white,
  },
  syncBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 24,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: palette.card,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 14,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  heroCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: palette.cardAlt,
    gap: 10,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: palette.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroBadgeText: {
    color: palette.green,
    fontWeight: '600',
    fontSize: 12,
  },
  heroTitle: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 28,
  },
  heroText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryAction: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: palette.green,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionText: {
    color: palette.white,
    fontWeight: '700',
  },
  secondaryAction: {
    minHeight: 42,
    borderRadius: 12,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  secondaryActionText: {
    color: palette.ink,
    fontWeight: '600',
  },
  metricRow: {
    gap: 12,
    paddingRight: 6,
  },
  metricCard: {
    width: 168,
    padding: 14,
    backgroundColor: palette.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 8,
  },
  metricIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconGreen: {
    backgroundColor: palette.greenSoft,
  },
  metricIconAmber: {
    backgroundColor: palette.amberSoft,
  },
  metricIconRed: {
    backgroundColor: palette.redSoft,
  },
  metricIconBlue: {
    backgroundColor: palette.blueSoft,
  },
  metricLabel: {
    color: palette.subtle,
    fontSize: 12,
  },
  metricValue: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  metricDetail: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  calendarDayCard: {
    width: 96,
    padding: 12,
    borderRadius: 16,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    gap: 4,
  },
  calendarDayCardActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  calendarDayShort: {
    color: palette.subtle,
    fontSize: 12,
    fontWeight: '700',
  },
  calendarDayShortActive: {
    color: '#d8efe8',
  },
  calendarDayDate: {
    color: palette.ink,
    fontSize: 18,
    fontWeight: '800',
  },
  calendarDayDateActive: {
    color: palette.white,
  },
  calendarDayMeta: {
    color: palette.muted,
    fontSize: 11,
  },
  calendarDayMetaActive: {
    color: '#d8efe8',
  },
  agendaSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickTile: {
    width: '48%',
    minWidth: 148,
    borderRadius: 16,
    padding: 14,
    backgroundColor: palette.cardAlt,
    gap: 6,
  },
  quickTitle: {
    color: palette.ink,
    fontWeight: '700',
    fontSize: 14,
  },
  quickText: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  listCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 10,
    backgroundColor: palette.card,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  listHeaderMain: {
    flex: 1,
    gap: 2,
  },
  listTitle: {
    color: palette.ink,
    fontWeight: '700',
    fontSize: 15,
  },
  listSubtitle: {
    color: palette.subtle,
    fontSize: 12,
    lineHeight: 16,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e6e2d7',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: palette.green,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoLabel: {
    color: palette.subtle,
    fontSize: 12,
    flexShrink: 0,
  },
  infoValue: {
    color: palette.ink,
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
    textAlign: 'right',
  },
  footnote: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  filterRow: {
    gap: 8,
    paddingRight: 6,
  },
  filterChip: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  filterChipText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: palette.white,
  },
  jobCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 14,
    gap: 10,
    backgroundColor: palette.card,
  },
  jobCardActive: {
    borderColor: '#8eb2a7',
    backgroundColor: '#f8fcfa',
  },
  pill: {
    minHeight: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: palette.ink,
    fontSize: 11,
    fontWeight: '700',
  },
  pillGreen: {
    backgroundColor: palette.greenSoft,
  },
  pillAmber: {
    backgroundColor: palette.amberSoft,
  },
  pillRed: {
    backgroundColor: palette.redSoft,
  },
  pillBlue: {
    backgroundColor: palette.blueSoft,
  },
  pillNeutral: {
    backgroundColor: '#ebe7dc',
  },
  photoStatRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  photoMini: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    minHeight: 28,
    borderRadius: 999,
    backgroundColor: palette.cardAlt,
  },
  photoMiniText: {
    color: palette.muted,
    fontSize: 12,
  },
  expandedArea: {
    gap: 12,
    paddingTop: 2,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  smallAction: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  smallActionText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '600',
  },
  subsectionLabel: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  checklistWrap: {
    gap: 8,
  },
  checkItem: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkItemActive: {
    backgroundColor: palette.greenSoft,
    borderColor: '#9bc1b4',
  },
  checkItemText: {
    color: palette.ink,
    fontSize: 13,
    flex: 1,
  },
  checkItemTextActive: {
    fontWeight: '700',
  },
  photoActionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photoAction: {
    flex: 1,
    minHeight: 84,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
  },
  photoActionTitle: {
    color: palette.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  photoActionCount: {
    color: palette.muted,
    fontSize: 12,
  },
  noteCard: {
    borderRadius: 14,
    backgroundColor: palette.cardAlt,
    padding: 12,
    gap: 6,
  },
  noteTitle: {
    color: palette.ink,
    fontWeight: '700',
    fontSize: 12,
  },
  noteText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  noteFoot: {
    color: palette.subtle,
    fontSize: 12,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    color: palette.subtle,
    fontSize: 12,
    fontWeight: '600',
  },
  textInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    color: palette.ink,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 110,
    paddingTop: 12,
    paddingBottom: 12,
  },
  optionWrap: {
    gap: 10,
  },
  optionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    padding: 14,
    gap: 4,
  },
  optionCardActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  optionTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  optionTitleActive: {
    color: palette.white,
  },
  optionDetail: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  optionDetailActive: {
    color: '#dcede7',
  },
  stepperCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.cardAlt,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  stepperValue: {
    color: palette.ink,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },
  stepperControls: {
    flexDirection: 'row',
    gap: 10,
  },
  stepperButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedRow: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: palette.green,
    borderColor: palette.green,
  },
  segmentButtonText: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: palette.white,
  },
  extraRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.white,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  extraRowActive: {
    backgroundColor: palette.greenSoft,
    borderColor: '#9cc1b3',
  },
  extraMain: {
    flex: 1,
    gap: 3,
  },
  extraTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  extraDetail: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  extraAside: {
    alignItems: 'flex-end',
    gap: 6,
  },
  extraPrice: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: '700',
  },
  switchRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: palette.line,
    backgroundColor: palette.cardAlt,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
    alignItems: 'center',
  },
  switchTextWrap: {
    flex: 1,
    gap: 3,
  },
  switchTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  switchDetail: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  quoteSummary: {
    borderRadius: 16,
    backgroundColor: palette.cardAlt,
    padding: 16,
    gap: 10,
  },
  quoteSummaryLabel: {
    color: palette.subtle,
    fontSize: 12,
  },
  quoteSummaryValue: {
    color: palette.ink,
    fontSize: 30,
    fontWeight: '800',
  },
  quoteSummaryDetail: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  messageCard: {
    borderRadius: 14,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 12,
    gap: 6,
  },
  messageCardTitle: {
    color: palette.ink,
    fontSize: 12,
    fontWeight: '700',
  },
  messageCardText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  pipelineCard: {
    width: 144,
    padding: 14,
    borderRadius: 16,
    backgroundColor: palette.cardAlt,
    gap: 6,
  },
  pipelineLabel: {
    color: palette.subtle,
    fontSize: 12,
  },
  pipelineValue: {
    color: palette.ink,
    fontSize: 26,
    fontWeight: '800',
  },
  pipelineAmount: {
    color: palette.muted,
    fontSize: 12,
  },
  crmService: {
    color: palette.ink,
    fontSize: 14,
    lineHeight: 19,
  },
  collectionTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  collectionTotal: {
    color: palette.ink,
    fontSize: 28,
    fontWeight: '800',
    marginTop: 4,
  },
  switchInline: {
    alignItems: 'center',
    gap: 6,
  },
  switchInlineText: {
    color: palette.subtle,
    fontSize: 12,
  },
  switchRowCompact: {
    borderRadius: 12,
    backgroundColor: palette.cardAlt,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  collectionAmount: {
    color: palette.ink,
    fontSize: 22,
    fontWeight: '800',
  },
  emptyState: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.line,
    borderStyle: 'dashed',
    padding: 18,
    gap: 8,
    alignItems: 'center',
    backgroundColor: palette.cardAlt,
  },
  emptyStateTitle: {
    color: palette.ink,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyStateText: {
    color: palette.muted,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 17,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 6,
    paddingTop: 8,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    backgroundColor: '#f8f6f0',
  },
  tabButton: {
    alignItems: 'center',
    gap: 4,
    minWidth: 52,
  },
  tabIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconWrapActive: {
    backgroundColor: palette.greenSoft,
  },
  tabLabel: {
    color: palette.subtle,
    fontSize: 10,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: palette.green,
  },
})
