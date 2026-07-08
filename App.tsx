import AsyncStorage from '@react-native-async-storage/async-storage'
import { Feather } from '@expo/vector-icons'
import { StatusBar } from 'expo-status-bar'
import type { ComponentProps } from 'react'
import { useEffect } from 'react'
import { Alert, Linking, Pressable, ScrollView, Switch, Text, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'

import { AgendaScreen } from './src/screens/Agenda'
import { CollectionsScreen } from './src/screens/Collections'
import { CrmScreen } from './src/screens/Crm'
import { DemoScreen } from './src/screens/Demo'
import { JobsScreen } from './src/screens/Jobs'
import { QuoteScreen } from './src/screens/Quote'
import { TodayScreen } from './src/screens/Today'
import { TonePill } from './src/components/TonePill'

import { useAppState } from './src/state/useAppState'
import { useJobsState } from './src/state/useJobsState'
import { useQuoteState } from './src/state/useQuoteState'
import { useAgendaState } from './src/state/useAgendaState'
import { useCrmState } from './src/state/useCrmState'
import { useCollectionsState } from './src/state/useCollectionsState'

import {
  collections,
  extraOptions,
  jobs,
  leads,
  serviceDefinitions,
  tabs,
  translateText,
  zoneDefinitions,
  type Lead,
  type TabId,
} from './src/data'
import { merchantProfile } from './src/merchant'
import styles from './src/styles/shared'

const frequencyDiscountMap: Record<string, number> = {
  semanal: -0.11,
  quincenal: -0.05,
  mensual: 0,
}

export default function App() {
  const { language, setLanguage, tab, setTab, crewMode, setCrewMode, demoMode, setDemoMode, copy } =
    useAppState()

  const jobsState = useJobsState(copy)
  const quoteState = useQuoteState()
  const agendaState = useAgendaState(language, quoteState.requiresInvoice, copy)
  const crmState = useCrmState()
  const collectionsState = useCollectionsState()

  // Restore persisted state on mount
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

  const applyDemoPreset = () => {
    jobsState.resetJobsState()
    agendaState.resetAgendaState()
    quoteState.setClientName('Casa Garza')
    quoteState.setClientNeighborhood('San Jeronimo')
    quoteState.setServiceType('mantenimiento')
    quoteState.setFrequency('semanal')
    quoteState.setZone('residencial')
    quoteState.setArea(320)
    quoteState.setRequiresInvoice(false)
    quoteState.setSelectedExtras(['deshierbe', 'riego'])
    quoteState.setQuoteCustomSpanish(
      'Puedo pasar manana entre 9 y 11 am y mandar evidencia por WhatsApp.',
    )
    quoteState.setQuoteCustomEnglish(
      'I can come by tomorrow between 9 and 11 am and send photo proof on WhatsApp.',
    )
    crmState.setLeadFilter('nuevo')
    collectionsState.setInvoiceOnly(false)
    jobsState.setSelectedJobId(jobs[0].id)
    jobsState.setSelectedCrew('all')
    agendaState.setScheduleClient('Casa Garza')
    agendaState.setScheduleServiceType('mantenimiento')
    agendaState.setScheduleCrewId('norte')
    agendaState.setScheduleTime('09:00')
    agendaState.setScheduleRecurring(true)
    agendaState.setScheduleFrequency('semanal')
  }

  const clearDemoPreset = () => {
    jobsState.resetJobsState()
    agendaState.resetAgendaState()
    quoteState.resetQuoteState()
    crmState.resetCrmState()
    collectionsState.resetCollectionsState()
    jobsState.setSelectedJobId(jobs[1].id)
    jobsState.setSelectedCrew('all')
  }

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

  const jumpLeadToQuote = (lead: Lead) => {
    quoteState.setClientName(lead.client)
    quoteState.setClientNeighborhood(lead.neighborhood)
    const lower = translateText(lead.service, language).toLowerCase()
    const inferredType =
      lower.includes('poda') || lower.includes('prun')
        ? 'poda'
        : lower.includes('riego') || lower.includes('grava') || lower.includes('diseno') ||
          lower.includes('irrigation') || lower.includes('gravel') || lower.includes('design') ||
          lower.includes('landscap')
        ? 'paisajismo'
        : 'mantenimiento'
    quoteState.setServiceType(inferredType)
    setTab('cotizar')
  }

  // Derived metrics needed across screens
  const evidencePending = jobsState.liveJobs.filter(
    (job) => job.beforePhotos === 0 || job.afterPhotos === 0,
  ).length

  const totalCollections = collections.reduce((sum, item) => sum + item.amount, 0)
  const invoiceCollections = collections.filter((item) => item.invoice).length
  const pipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0)
  const leadsVisible =
    crmState.leadFilter === 'todas'
      ? leads
      : leads.filter((lead) => lead.stage === crmState.leadFilter)

  // Quote total for Demo screen
  const quoteServiceDef = serviceDefinitions.find((item) => item.id === quoteState.serviceType)
  const quoteExtrasSelected = extraOptions.filter((item) =>
    quoteState.selectedExtras.includes(item.id),
  )
  const quoteBase = quoteServiceDef
    ? quoteServiceDef.base +
      quoteState.area * quoteServiceDef.sqmRate +
      zoneDefinitions[quoteState.zone].fee
    : 0
  const quoteExtrasTotal = quoteExtrasSelected.reduce((sum, item) => sum + item.price, 0)
  const quoteDiscount =
    quoteState.serviceType === 'mantenimiento'
      ? Math.round(quoteBase * (frequencyDiscountMap[quoteState.frequency] ?? 0))
      : 0
  const quoteTotal = Math.max(quoteBase + quoteExtrasTotal + quoteDiscount, 1200)

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar style="dark" />
        <View style={styles.appShell}>
          <View style={styles.topBar}>
            <View style={styles.brandBlock}>
              <View style={styles.brandIcon}>
                <Feather name="feather" size={16} color="#195847" />
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
                    style={[styles.segmentMini, language === 'es' && styles.segmentMiniActive]}
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
                    style={[styles.segmentMini, language === 'en' && styles.segmentMiniActive]}
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
                  thumbColor="#ffffff"
                />
              </View>

              <View style={styles.modeSwitch}>
                <Text style={styles.modeLabel}>{copy.app.modeLabel}</Text>
                <Switch
                  value={crewMode}
                  onValueChange={setCrewMode}
                  trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
                  thumbColor="#ffffff"
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
            {tab === 'demo' ? (
              <DemoScreen
                language={language}
                crewMode={crewMode}
                copy={copy}
                demoMode={demoMode}
                liveJobs={jobsState.liveJobs}
                slotsForSelectedDayLength={agendaState.slotsForSelectedDay.length}
                planItemsLength={agendaState.planItems.length}
                selectedJobChecklistDone={jobsState.selectedJob?.checklistDone ?? 0}
                selectedJobChecklistTotal={jobsState.selectedJob?.checklistTotal ?? 5}
                evidencePending={evidencePending}
                quoteTotal={quoteTotal}
                pipelineValue={pipelineValue}
                leadsVisibleLength={leadsVisible.length}
                totalCollections={totalCollections}
                invoiceCollections={invoiceCollections}
                openFeatureFromDemo={openFeatureFromDemo}
              />
            ) : null}
            {tab === 'hoy' ? (
              <TodayScreen
                language={language}
                crewMode={crewMode}
                copy={copy}
                liveJobs={jobsState.liveJobs}
                setTab={setTab}
                openWhatsApp={openWhatsApp}
              />
            ) : null}
            {tab === 'agenda' ? (
              <AgendaScreen
                language={language}
                copy={copy}
                calendarView={agendaState.calendarView}
                selectedDayId={agendaState.selectedDayId}
                setSelectedDayId={agendaState.setSelectedDayId}
                slotsForSelectedDay={agendaState.slotsForSelectedDay}
                scheduledSlots={agendaState.scheduledSlots}
                planItems={agendaState.planItems}
                scheduleClient={agendaState.scheduleClient}
                setScheduleClient={agendaState.setScheduleClient}
                scheduleServiceType={agendaState.scheduleServiceType}
                setScheduleServiceType={agendaState.setScheduleServiceType}
                scheduleCrewId={agendaState.scheduleCrewId}
                setScheduleCrewId={agendaState.setScheduleCrewId}
                scheduleTime={agendaState.scheduleTime}
                setScheduleTime={agendaState.setScheduleTime}
                scheduleRecurring={agendaState.scheduleRecurring}
                setScheduleRecurring={agendaState.setScheduleRecurring}
                scheduleFrequency={agendaState.scheduleFrequency}
                setScheduleFrequency={agendaState.setScheduleFrequency}
                requiresInvoice={quoteState.requiresInvoice}
                setRequiresInvoice={quoteState.setRequiresInvoice}
                selectedCalendarDay={agendaState.selectedCalendarDay}
                selectedDayLabel={agendaState.selectedDayLabel}
                scheduledDayLabel={agendaState.scheduledDayLabel}
                handleCreateSchedule={agendaState.handleCreateSchedule}
                handleMoveSchedule={agendaState.handleMoveSchedule}
                handleConfirmSchedule={agendaState.handleConfirmSchedule}
                handlePlanAutopilot={agendaState.handlePlanAutopilot}
                openWhatsApp={openWhatsApp}
              />
            ) : null}
            {tab === 'trabajos' ? (
              <JobsScreen
                language={language}
                copy={copy}
                visibleJobs={jobsState.visibleJobs}
                selectedJob={jobsState.selectedJob}
                selectedJobId={jobsState.selectedJobId}
                setSelectedJobId={jobsState.setSelectedJobId}
                selectedCrew={jobsState.selectedCrew}
                setSelectedCrew={jobsState.setSelectedCrew}
                checklists={jobsState.checklists}
                handleAdvanceJob={jobsState.handleAdvanceJob}
                handleTaskToggle={jobsState.handleTaskToggle}
                handlePickPhoto={jobsState.handlePickPhoto}
                openWhatsApp={openWhatsApp}
                openMaps={openMaps}
              />
            ) : null}
            {tab === 'cotizar' ? (
              <QuoteScreen
                language={language}
                copy={copy}
                clientName={quoteState.clientName}
                setClientName={quoteState.setClientName}
                clientNeighborhood={quoteState.clientNeighborhood}
                setClientNeighborhood={quoteState.setClientNeighborhood}
                serviceType={quoteState.serviceType}
                setServiceType={quoteState.setServiceType}
                frequency={quoteState.frequency}
                setFrequency={quoteState.setFrequency}
                zone={quoteState.zone}
                setZone={quoteState.setZone}
                area={quoteState.area}
                setArea={quoteState.setArea}
                requiresInvoice={quoteState.requiresInvoice}
                setRequiresInvoice={quoteState.setRequiresInvoice}
                selectedExtras={quoteState.selectedExtras}
                quoteCustomSpanish={quoteState.quoteCustomSpanish}
                setQuoteCustomSpanish={quoteState.setQuoteCustomSpanish}
                quoteCustomEnglish={quoteState.quoteCustomEnglish}
                setQuoteCustomEnglish={quoteState.setQuoteCustomEnglish}
                handleExtraToggle={quoteState.handleExtraToggle}
                openWhatsApp={openWhatsApp}
              />
            ) : null}
            {tab === 'crm' ? (
              <CrmScreen
                language={language}
                copy={copy}
                leadFilter={crmState.leadFilter}
                setLeadFilter={crmState.setLeadFilter}
                jumpLeadToQuote={jumpLeadToQuote}
                openWhatsApp={openWhatsApp}
              />
            ) : null}
            {tab === 'cobranza' ? (
              <CollectionsScreen
                language={language}
                copy={copy}
                invoiceOnly={collectionsState.invoiceOnly}
                setInvoiceOnly={collectionsState.setInvoiceOnly}
                openWhatsApp={openWhatsApp}
              />
            ) : null}
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
                      color={active ? '#195847' : '#738171'}
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
