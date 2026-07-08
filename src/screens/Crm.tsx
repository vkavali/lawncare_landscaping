import { Feather } from '@expo/vector-icons'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { TonePill } from '../components/TonePill'
import {
  leads,
  quickTemplates,
  translateText,
  type Language,
  type Lead,
  type LeadStage,
} from '../data'
import {
  buildCrmFollowUpMessage,
  leadStageLabel,
  type getTranslation,
} from '../i18n'
import styles from '../styles/shared'
import { formatCurrency } from '../utils/format'
import { useMemo } from 'react'

const leadStages: Array<LeadStage | 'todas'> = ['todas', 'nuevo', 'visita', 'propuesta', 'anticipo']

interface CrmScreenProps {
  language: Language
  copy: ReturnType<typeof getTranslation>
  leadFilter: LeadStage | 'todas'
  setLeadFilter: (filter: LeadStage | 'todas') => void
  jumpLeadToQuote: (lead: Lead) => void
  openWhatsApp: (message: string) => void
}

export function CrmScreen({
  language,
  copy,
  leadFilter,
  setLeadFilter,
  jumpLeadToQuote,
  openWhatsApp,
}: CrmScreenProps) {
  const leadsVisible =
    leadFilter === 'todas' ? leads : leads.filter((lead) => lead.stage === leadFilter)

  const pipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0)

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

  return (
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
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
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
                <Feather name="message-circle" size={14} color="#17211b" />
                <Text style={styles.smallActionText}>{copy.crm.respond}</Text>
              </Pressable>
              <Pressable style={styles.smallAction} onPress={() => jumpLeadToQuote(lead)}>
                <Feather name="edit-3" size={14} color="#17211b" />
                <Text style={styles.smallActionText}>{copy.crm.buildQuote}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  )
}
