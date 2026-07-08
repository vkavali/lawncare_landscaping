import { Feather } from '@expo/vector-icons'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { MetricCard } from '../components/MetricCard'
import { ProgressBar } from '../components/ProgressBar'
import { SectionCard } from '../components/SectionCard'
import { TonePill } from '../components/TonePill'
import {
  collections,
  crews,
  leads,
  quickTemplates,
  rainAlert,
  trackingPings,
  translateText,
  type Job,
  type Language,
  type TabId,
} from '../data'
import type { getTranslation } from '../i18n'
import { unitLabel } from '../i18n'
import styles from '../styles/shared'
import { formatCurrency } from '../utils/format'

function getToneForTrackingStatus(status: (typeof trackingPings)[number]['status']) {
  switch (status) {
    case 'normal': return 'green'
    case 'retraso': return 'amber'
    case 'desvio': return 'red'
  }
}

interface TodayScreenProps {
  language: Language
  crewMode: boolean
  copy: ReturnType<typeof getTranslation>
  liveJobs: Job[]
  setTab: (tab: TabId) => void
  openWhatsApp: (message: string) => void
}

export function TodayScreen({ language, crewMode, copy, liveJobs, setTab, openWhatsApp }: TodayScreenProps) {
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

  return (
    <>
      <SectionCard
        title={copy.sections.todayTitle}
        subtitle={crewMode ? copy.sections.todaySubtitleCrew : copy.sections.todaySubtitleOwner}
      >
        <View style={styles.heroCard}>
          <View style={styles.heroBadge}>
            <Feather name="cloud-rain" size={16} color="#195847" />
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
              <Feather name="navigation" size={16} color="#ffffff" />
              <Text style={styles.primaryActionText}>{copy.today.moveRoute}</Text>
            </Pressable>
            <Pressable
              style={styles.secondaryAction}
              onPress={() => openWhatsApp(translateText(quickTemplates.reminder, language))}
            >
              <Feather name="message-circle" size={16} color="#17211b" />
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
          detail={`${liveJobs.length} ${copy.today.opportunitiesSuffix}`}
          tone="blue"
        />
      </ScrollView>

      <SectionCard
        title={copy.sections.quickActionsTitle}
        subtitle={copy.sections.quickActionsSubtitle}
      >
        <View style={styles.quickGrid}>
          <Pressable style={styles.quickTile} onPress={() => setTab('trabajos')}>
            <Feather name="play-circle" size={18} color="#195847" />
            <Text style={styles.quickTitle}>{copy.today.startJob}</Text>
            <Text style={styles.quickText}>{copy.today.startJobDetail}</Text>
          </Pressable>
          <Pressable style={styles.quickTile} onPress={() => setTab('cotizar')}>
            <Feather name="edit-3" size={18} color="#195847" />
            <Text style={styles.quickTitle}>{copy.today.quoteOnSite}</Text>
            <Text style={styles.quickText}>{copy.today.quoteOnSiteDetail}</Text>
          </Pressable>
          <Pressable
            style={styles.quickTile}
            onPress={() => openWhatsApp(translateText(quickTemplates.followUp, language))}
          >
            <Feather name="send" size={18} color="#195847" />
            <Text style={styles.quickTitle}>{copy.today.followup}</Text>
            <Text style={styles.quickText}>{copy.today.followupDetail}</Text>
          </Pressable>
          <Pressable style={styles.quickTile} onPress={() => setTab('cobranza')}>
            <Feather name="check-circle" size={18} color="#195847" />
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
}
