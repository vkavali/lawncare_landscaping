import { Feather } from '@expo/vector-icons'
import { Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { TonePill } from '../components/TonePill'
import {
  crews,
  serviceDefinitions,
  translateText,
  type Frequency,
  type Language,
  type RecurringPlan,
  type ScheduleSlot,
  type ServiceType,
} from '../data'
import {
  frequencyLabel,
  scheduleInvoiceLabel,
  buildHeadsUpMessage,
  buildScheduleConfirmationMessage,
  type getTranslation,
} from '../i18n'
import styles from '../styles/shared'
import { formatCurrency } from '../utils/format'

const quickTimeSlots = ['07:30', '09:00', '11:30', '14:00', '16:30']

function getToneForScheduleStatus(status: ScheduleSlot['status']) {
  switch (status) {
    case 'confirmado': return 'green'
    case 'por-confirmar': return 'blue'
    case 'reprogramar': return 'amber'
  }
}

interface AgendaScreenProps {
  language: Language
  copy: ReturnType<typeof getTranslation>
  calendarView: Array<{
    id: string
    shortLabel: { en: string; es: string }
    dayLabel: { en: string; es: string }
    dateLabel: { en: string; es: string }
    weather: { en: string; es: string }
    scheduledCount: number
    busyCrews: number
  }>
  selectedDayId: string
  setSelectedDayId: (id: string) => void
  slotsForSelectedDay: ScheduleSlot[]
  scheduledSlots: ScheduleSlot[]
  planItems: RecurringPlan[]
  scheduleClient: string
  setScheduleClient: (v: string) => void
  scheduleServiceType: ServiceType
  setScheduleServiceType: (v: ServiceType) => void
  scheduleCrewId: string
  setScheduleCrewId: (v: string) => void
  scheduleTime: string
  setScheduleTime: (v: string) => void
  scheduleRecurring: boolean
  setScheduleRecurring: (v: boolean) => void
  scheduleFrequency: Frequency
  setScheduleFrequency: (v: Frequency) => void
  requiresInvoice: boolean
  setRequiresInvoice: (v: boolean) => void
  selectedCalendarDay: {
    id: string
    shortLabel: { en: string; es: string }
    dayLabel: { en: string; es: string }
    dateLabel: { en: string; es: string }
    weather: { en: string; es: string }
    scheduledCount: number
    busyCrews: number
  } | undefined
  selectedDayLabel: string
  scheduledDayLabel: string
  handleCreateSchedule: () => void
  handleMoveSchedule: (slotId: string) => void
  handleConfirmSchedule: (slotId: string) => void
  handlePlanAutopilot: (planId: string) => void
  openWhatsApp: (message: string) => void
}

export function AgendaScreen({
  language,
  copy,
  calendarView,
  selectedDayId,
  setSelectedDayId,
  slotsForSelectedDay,
  planItems,
  scheduleClient,
  setScheduleClient,
  scheduleServiceType,
  setScheduleServiceType,
  scheduleCrewId,
  setScheduleCrewId,
  scheduleTime,
  setScheduleTime,
  scheduleRecurring,
  setScheduleRecurring,
  scheduleFrequency,
  setScheduleFrequency,
  requiresInvoice,
  setRequiresInvoice,
  selectedCalendarDay,
  selectedDayLabel,
  scheduledDayLabel,
  handleCreateSchedule,
  handleMoveSchedule,
  handleConfirmSchedule,
  handlePlanAutopilot,
  openWhatsApp,
}: AgendaScreenProps) {
  return (
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
                <Text style={[styles.calendarDayShort, active && styles.calendarDayShortActive]}>
                  {translateText(day.shortLabel, language)}
                </Text>
                <Text style={[styles.calendarDayDate, active && styles.calendarDayDateActive]}>
                  {translateText(day.dateLabel, language)}
                </Text>
                <Text style={[styles.calendarDayMeta, active && styles.calendarDayMetaActive]}>
                  {day.scheduledCount} {language === 'es' ? 'slots' : 'slots'}
                </Text>
                <Text style={[styles.calendarDayMeta, active && styles.calendarDayMetaActive]}>
                  {day.busyCrews} {language === 'es' ? 'cuadrillas' : 'crews'}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.agendaSummary}>
          <View>
            <Text style={styles.listTitle}>
              {selectedCalendarDay ? translateText(selectedCalendarDay.dayLabel, language) : ''}
            </Text>
            <Text style={styles.listSubtitle}>
              {selectedCalendarDay ? translateText(selectedCalendarDay.dateLabel, language) : ''}
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
            placeholderTextColor="#738171"
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
                <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>
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
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
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
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
                  {slot}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        <View style={styles.switchRow}>
          <View style={styles.switchTextWrap}>
            <Text style={styles.switchTitle}>{copy.switches.recurringTitle}</Text>
            <Text style={styles.switchDetail}>{copy.switches.recurringDetail}</Text>
          </View>
          <Switch
            value={scheduleRecurring}
            onValueChange={setScheduleRecurring}
            trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
            thumbColor="#ffffff"
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
                  <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>
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
            thumbColor="#ffffff"
          />
        </View>

        <View style={styles.actionRow}>
          <Pressable style={styles.primaryAction} onPress={handleCreateSchedule}>
            <Feather name="calendar" size={16} color="#ffffff" />
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
            <Feather name="message-circle" size={16} color="#17211b" />
            <Text style={styles.secondaryActionText}>{copy.agenda.headsUp}</Text>
          </Pressable>
        </View>
      </SectionCard>

      <SectionCard
        title={`${copy.sections.daySlotsPrefix} ${
          selectedCalendarDay
            ? translateText(selectedCalendarDay.dayLabel, language)
            : (language === 'es' ? 'la agenda' : 'the schedule')
        }`}
        subtitle={copy.sections.daySlotsSubtitle}
      >
        {slotsForSelectedDay.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="calendar" size={20} color="#738171" />
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
                    <Feather name="check-circle" size={14} color="#17211b" />
                    <Text style={styles.smallActionText}>{copy.agenda.confirm}</Text>
                  </Pressable>
                ) : null}
                <Pressable
                  style={styles.smallAction}
                  onPress={() => handleMoveSchedule(slot.id)}
                >
                  <Feather name="skip-forward" size={14} color="#17211b" />
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
                  <Feather name="message-circle" size={14} color="#17211b" />
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
                thumbColor="#ffffff"
              />
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  )
}
