import { Feather } from '@expo/vector-icons'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { TonePill } from '../components/TonePill'
import {
  checklistLabels,
  crews,
  translateText,
  type Job,
  type JobStatus,
  type Language,
  type TaskKey,
} from '../data'
import { allLabel, jobStatusLabel, type getTranslation } from '../i18n'
import styles from '../styles/shared'
import { formatCurrency } from '../utils/format'
import {
  buildEnRouteMessage,
} from '../i18n'

const taskOrder: TaskKey[] = ['llegada', 'fotoAntes', 'trabajo', 'fotoDespues', 'cobro']

function getToneForStatus(status: JobStatus) {
  switch (status) {
    case 'en-ruta': return 'blue'
    case 'trabajando': return 'green'
    case 'pendiente-cobro': return 'amber'
    case 'cerrado': return 'neutral'
  }
}

interface JobsScreenProps {
  language: Language
  copy: ReturnType<typeof getTranslation>
  visibleJobs: Job[]
  selectedJob: Job | undefined
  selectedJobId: string
  setSelectedJobId: (id: string) => void
  selectedCrew: string
  setSelectedCrew: (crew: string) => void
  checklists: Record<string, Record<TaskKey, boolean>>
  handleAdvanceJob: (job: Job) => void
  handleTaskToggle: (jobId: string, task: TaskKey) => void
  handlePickPhoto: (jobId: string, phase: 'before' | 'after') => void
  openWhatsApp: (message: string) => void
  openMaps: (address: string) => void
}

export function JobsScreen({
  language,
  copy,
  visibleJobs,
  selectedJob,
  selectedJobId,
  setSelectedJobId,
  selectedCrew,
  setSelectedCrew,
  checklists,
  handleAdvanceJob,
  handleTaskToggle,
  handlePickPhoto,
  openWhatsApp,
  openMaps,
}: JobsScreenProps) {
  const crewFilters = ['all', ...crews.map((crew) => crew.id)]

  return (
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
                <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>
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
                  <Feather name="image" size={14} color="#566257" />
                  <Text style={styles.photoMiniText}>
                    {copy.jobs.before} {job.beforePhotos}
                  </Text>
                </View>
                <View style={styles.photoMini}>
                  <Feather name="image" size={14} color="#566257" />
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
                      <Feather name="map-pin" size={14} color="#17211b" />
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
                      <Feather name="message-circle" size={14} color="#17211b" />
                      <Text style={styles.smallActionText}>{copy.jobs.whatsapp}</Text>
                    </Pressable>
                    <Pressable
                      style={styles.smallAction}
                      onPress={() => handleAdvanceJob(job)}
                    >
                      <Feather name="arrow-right-circle" size={14} color="#17211b" />
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
                          color={checklists[job.id][task] ? '#195847' : '#738171'}
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
                      <Feather name="camera" size={16} color="#17211b" />
                      <Text style={styles.photoActionTitle}>{copy.jobs.before}</Text>
                      <Text style={styles.photoActionCount}>
                        {job.beforePhotos} {copy.jobs.photos}
                      </Text>
                    </Pressable>
                    <Pressable
                      style={styles.photoAction}
                      onPress={() => handlePickPhoto(job.id, 'after')}
                    >
                      <Feather name="camera" size={16} color="#17211b" />
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
}
