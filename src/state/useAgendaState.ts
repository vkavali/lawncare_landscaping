import { useMemo, useState } from 'react'
import { Alert } from 'react-native'
import {
  calendarDays,
  crews,
  scheduleSlots,
  recurringPlans,
  serviceDefinitions,
  type Frequency,
  type ScheduleSlot,
  type ServiceType,
  translateText,
} from '../data'
import { buildBookedMessage, frequencyLabel } from '../i18n'
import type { Language } from '../data'

const quickTimeSlots = ['07:30', '09:00', '11:30', '14:00', '16:30']

const visitsPerMonth: Record<Frequency, number> = { semanal: 4, quincenal: 2, mensual: 1 }

export function useAgendaState(
  language: Language,
  requiresInvoice: boolean,
  copy: { agenda: { missingClientTitle: string; missingClientText: string; slotBookedTitle: string } },
) {
  const [selectedDayId, setSelectedDayId] = useState(calendarDays[0].id)
  const [scheduleClient, setScheduleClient] = useState('')
  const [scheduleServiceType, setScheduleServiceType] = useState<ServiceType>('mantenimiento')
  const [scheduleCrewId, setScheduleCrewId] = useState(crews[0].id)
  const [scheduleTime, setScheduleTime] = useState(quickTimeSlots[2])
  const [scheduleRecurring, setScheduleRecurring] = useState(true)
  const [scheduleFrequency, setScheduleFrequency] = useState<Frequency>('semanal')
  const [scheduledSlots, setScheduledSlots] = useState(scheduleSlots)
  const [planItems, setPlanItems] = useState(recurringPlans)

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
      current.map((slot) => (slot.id === slotId ? { ...slot, status: 'confirmado' } : slot)),
    )
  }

  const handlePlanAutopilot = (planId: string) => {
    setPlanItems((current) =>
      current.map((plan) => (plan.id === planId ? { ...plan, autopilot: !plan.autopilot } : plan)),
    )
  }

  const resetAgendaState = () => {
    setScheduledSlots(scheduleSlots)
    setPlanItems(recurringPlans)
  }

  return {
    selectedDayId,
    setSelectedDayId,
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
    scheduledSlots,
    planItems,
    calendarView,
    selectedCalendarDay,
    selectedDayLabel,
    scheduledDayLabel,
    slotsForSelectedDay,
    handleCreateSchedule,
    handleMoveSchedule,
    handleConfirmSchedule,
    handlePlanAutopilot,
    resetAgendaState,
  }
}
