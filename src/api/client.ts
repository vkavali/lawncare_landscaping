import AsyncStorage from '@react-native-async-storage/async-storage'

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000'

const QUEUE_KEY = '@verde_ops/offline_queue'

type QueuedMutation = {
  id: string
  url: string
  method: string
  body?: unknown
  tenantId: string
  queuedAt: number
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem('@verde_ops/token')
}

async function getTenantId(): Promise<string | null> {
  return AsyncStorage.getItem('@verde_ops/tenant_id')
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit & { skipTenant?: boolean } = {},
): Promise<T> {
  const token = await getToken()
  const tenantId = await getTenantId()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(tenantId && !options.skipTenant ? { 'X-Tenant-Id': tenantId } : {}),
    ...(options.headers as Record<string, string> | undefined ?? {}),
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const json = await res.json() as { error?: string }
      if (json.error) message = typeof json.error === 'string' ? json.error : JSON.stringify(json.error)
    } catch { /* ignore */ }
    throw new ApiError(message, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function enqueueOfflineMutation(
  path: string,
  method: string,
  body: unknown,
): Promise<void> {
  const tenantId = (await getTenantId()) ?? ''
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  const queue: QueuedMutation[] = raw ? JSON.parse(raw) : []
  queue.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: path,
    method,
    body,
    tenantId,
    queuedAt: Date.now(),
  })
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

export async function flushOfflineQueue(): Promise<void> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY)
  if (!raw) return
  const queue: QueuedMutation[] = JSON.parse(raw)
  const remaining: QueuedMutation[] = []

  for (const item of queue) {
    try {
      await apiFetch(item.url, {
        method: item.method,
        body: item.body ? JSON.stringify(item.body) : undefined,
      })
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) continue
      remaining.push(item)
    }
  }

  if (remaining.length) {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining))
  } else {
    await AsyncStorage.removeItem(QUEUE_KEY)
  }
}
