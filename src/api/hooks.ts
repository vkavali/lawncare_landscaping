import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, enqueueOfflineMutation } from './client'

export function useJobs(filters?: { date?: string; crewId?: string; status?: string }) {
  const params = new URLSearchParams()
  if (filters?.date) params.set('date', filters.date)
  if (filters?.crewId) params.set('crewId', filters.crewId)
  if (filters?.status) params.set('status', filters.status)
  const qs = params.toString()
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => apiFetch<{ jobs: unknown[] }>(`/api/jobs${qs ? `?${qs}` : ''}`),
    select: (d) => d.jobs,
  })
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ['jobs', id],
    queryFn: () => apiFetch<{ job: unknown }>(`/api/jobs/${id}`),
    enabled: !!id,
    select: (d) => d.job,
  })
}

export function useAdvanceJobStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cancel, note }: { id: string; cancel?: boolean; note?: string }) =>
      apiFetch(`/api/jobs/${id}/status`, {
        method: 'POST',
        body: JSON.stringify({ cancel, note }),
      }).catch(async () => {
        await enqueueOfflineMutation(`/api/jobs/${id}/status`, 'POST', { cancel, note })
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs'] }),
  })
}

export function useCustomers(q?: string) {
  const qs = q ? `?q=${encodeURIComponent(q)}` : ''
  return useQuery({
    queryKey: ['customers', q],
    queryFn: () => apiFetch<{ customers: unknown[] }>(`/api/customers${qs}`),
    select: (d) => d.customers,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: unknown) =>
      apiFetch('/api/customers', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useLeads(stage?: string) {
  const qs = stage ? `?stage=${stage}` : ''
  return useQuery({
    queryKey: ['leads', stage],
    queryFn: () => apiFetch<{ leads: unknown[] }>(`/api/leads${qs}`),
    select: (d) => d.leads,
  })
}

export function useUpdateLead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Record<string, unknown>) =>
      apiFetch(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).catch(
        async () => enqueueOfflineMutation(`/api/leads/${id}`, 'PATCH', body),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leads'] }),
  })
}

export function useInvoices(status?: string) {
  const qs = status ? `?status=${status}` : ''
  return useQuery({
    queryKey: ['invoices', status],
    queryFn: () => apiFetch<{ invoices: unknown[] }>(`/api/invoices${qs}`),
    select: (d) => d.invoices,
  })
}

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, ...body }: { invoiceId: string } & Record<string, unknown>) =>
      apiFetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        body: JSON.stringify(body),
      }).catch(async () =>
        enqueueOfflineMutation(`/api/invoices/${invoiceId}/payments`, 'POST', body),
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useEstimates() {
  return useQuery({
    queryKey: ['estimates'],
    queryFn: () => apiFetch<{ estimates: unknown[] }>('/api/estimates'),
    select: (d) => d.estimates,
  })
}

export function useCrews() {
  return useQuery({
    queryKey: ['crews'],
    queryFn: () => apiFetch<{ crews: unknown[] }>('/api/crews'),
    select: (d) => d.crews,
  })
}

export function useCatalog() {
  return useQuery({
    queryKey: ['catalog'],
    queryFn: () => apiFetch<{ items: unknown[] }>('/api/catalog'),
    select: (d) => d.items,
  })
}

export function useRecurringPlans() {
  return useQuery({
    queryKey: ['recurring-plans'],
    queryFn: () => apiFetch<{ plans: unknown[] }>('/api/recurring-plans?active=true'),
    select: (d) => d.plans,
  })
}
