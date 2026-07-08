import { useMemo, useState } from 'react'
import * as ImagePicker from 'expo-image-picker'
import { Alert } from 'react-native'
import { jobs, type Job, type JobStatus, type TaskKey } from '../data'
import type { getTranslation } from '../i18n'

const taskOrder: TaskKey[] = ['llegada', 'fotoAntes', 'trabajo', 'fotoDespues', 'cobro']

function buildInitialJobStatuses() {
  return jobs.reduce<Record<string, JobStatus>>((acc, job) => {
    acc[job.id] = job.status
    return acc
  }, {})
}

function buildInitialChecklists() {
  return jobs.reduce<Record<string, Record<TaskKey, boolean>>>((acc, job) => {
    const state = taskOrder.reduce<Record<TaskKey, boolean>>(
      (taskAcc, task, index) => {
        taskAcc[task] = index < job.checklistDone
        return taskAcc
      },
      { llegada: false, fotoAntes: false, trabajo: false, fotoDespues: false, cobro: false },
    )
    acc[job.id] = state
    return acc
  }, {})
}

function buildInitialPhotoCounts() {
  return jobs.reduce<Record<string, { before: number; after: number }>>((acc, job) => {
    acc[job.id] = { before: job.beforePhotos, after: job.afterPhotos }
    return acc
  }, {})
}

export function useJobsState(copy: ReturnType<typeof getTranslation>) {
  const [selectedJobId, setSelectedJobId] = useState(jobs[1].id)
  const [selectedCrew, setSelectedCrew] = useState<string>('all')
  const [jobStatuses, setJobStatuses] = useState<Record<string, JobStatus>>(buildInitialJobStatuses)
  const [checklists, setChecklists] = useState<Record<string, Record<TaskKey, boolean>>>(
    buildInitialChecklists,
  )
  const [photoCounts, setPhotoCounts] = useState<Record<string, { before: number; after: number }>>(
    buildInitialPhotoCounts,
  )

  const resetJobsState = () => {
    setJobStatuses(buildInitialJobStatuses())
    setChecklists(buildInitialChecklists())
    setPhotoCounts(buildInitialPhotoCounts())
  }

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
    () => (selectedCrew === 'all' ? liveJobs : liveJobs.filter((job) => job.crewId === selectedCrew)),
    [liveJobs, selectedCrew],
  )

  const selectedJob =
    visibleJobs.find((job) => job.id === selectedJobId) ?? visibleJobs[0] ?? liveJobs[0]

  const handleAdvanceJob = (job: Job) => {
    const nextStatus =
      job.status === 'en-ruta'
        ? 'trabajando'
        : job.status === 'trabajando'
          ? 'pendiente-cobro'
          : job.status === 'pendiente-cobro'
            ? 'cerrado'
            : 'en-ruta'

    setJobStatuses((current) => ({ ...current, [job.id]: nextStatus }))

    if (nextStatus === 'cerrado') {
      setChecklists((current) => ({
        ...current,
        [job.id]: { ...current[job.id], cobro: true, trabajo: true, fotoDespues: true },
      }))
    }
  }

  const handleTaskToggle = (jobId: string, task: TaskKey) => {
    setChecklists((current) => ({
      ...current,
      [jobId]: { ...current[jobId], [task]: !current[jobId][task] },
    }))
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

    if (result.canceled) return

    setPhotoCounts((current) => ({
      ...current,
      [jobId]: { ...current[jobId], [phase]: current[jobId][phase] + result.assets.length },
    }))

    if (phase === 'before') {
      setChecklists((current) => ({
        ...current,
        [jobId]: { ...current[jobId], fotoAntes: true },
      }))
    } else {
      setChecklists((current) => ({
        ...current,
        [jobId]: { ...current[jobId], fotoDespues: true },
      }))
    }
  }

  return {
    selectedJobId,
    setSelectedJobId,
    selectedCrew,
    setSelectedCrew,
    jobStatuses,
    checklists,
    photoCounts,
    liveJobs,
    visibleJobs,
    selectedJob,
    handleAdvanceJob,
    handleTaskToggle,
    handlePickPhoto,
    resetJobsState,
  }
}
