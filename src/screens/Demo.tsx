import { Feather } from '@expo/vector-icons'
import { Pressable, Text, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { TonePill } from '../components/TonePill'
import { tabs, translateText, type Job, type Language, type TabId } from '../data'
import type { getTranslation } from '../i18n'
import styles from '../styles/shared'
import { formatCurrency } from '../utils/format'

interface DemoScreenProps {
  language: Language
  crewMode: boolean
  copy: ReturnType<typeof getTranslation>
  demoMode: boolean
  liveJobs: Job[]
  slotsForSelectedDayLength: number
  planItemsLength: number
  selectedJobChecklistDone: number
  selectedJobChecklistTotal: number
  evidencePending: number
  quoteTotal: number
  pipelineValue: number
  leadsVisibleLength: number
  totalCollections: number
  invoiceCollections: number
  openFeatureFromDemo: (tab: Exclude<TabId, 'demo'>) => void
}

export function DemoScreen({
  language,
  crewMode,
  copy,
  demoMode,
  liveJobs,
  slotsForSelectedDayLength,
  planItemsLength,
  selectedJobChecklistDone,
  selectedJobChecklistTotal,
  evidencePending,
  quoteTotal,
  pipelineValue,
  leadsVisibleLength,
  totalCollections,
  invoiceCollections,
  openFeatureFromDemo,
}: DemoScreenProps) {
  const todayRevenue = liveJobs.reduce((sum, job) => sum + job.amount, 0)
  const atRiskByRain = liveJobs.filter(
    (job) => job.rainSensitive && job.status !== 'cerrado',
  ).length

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
      metricValue: `${slotsForSelectedDayLength}`,
      detailLabel: copy.labels.recurrence,
      detailValue: `${planItemsLength}`,
    },
    {
      id: 'trabajos',
      title: copy.sections.jobsTitle,
      subtitle: copy.sections.jobsSubtitle,
      metricLabel: copy.labels.checklist,
      metricValue: `${selectedJobChecklistDone}/${selectedJobChecklistTotal}`,
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
      detailValue: `${leadsVisibleLength}`,
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
              <Feather name="arrow-right-circle" size={14} color="#17211b" />
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
