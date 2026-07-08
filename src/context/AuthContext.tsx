import React, { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch } from '../api/client'

type User = { id: string; name: string; email: string }
type Tenant = { id: string; name: string; slug: string; tier: string }

type AuthState = {
  token: string | null
  user: User | null
  tenant: Tenant | null
  isLoading: boolean
  login: (token: string, user: User, tenant: Tenant) => Promise<void>
  logout: () => Promise<void>
  switchTenant: (tenant: Tenant) => Promise<void>
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  tenant: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
  switchTenant: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    ;(async () => {
      try {
        const [storedToken, storedUser, storedTenant] = await Promise.all([
          AsyncStorage.getItem('@verde_ops/token'),
          AsyncStorage.getItem('@verde_ops/user'),
          AsyncStorage.getItem('@verde_ops/tenant'),
        ])
        if (storedToken && storedUser && storedTenant) {
          setToken(storedToken)
          setUser(JSON.parse(storedUser) as User)
          setTenant(JSON.parse(storedTenant) as Tenant)
        }
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const login = async (t: string, u: User, ten: Tenant) => {
    await Promise.all([
      AsyncStorage.setItem('@verde_ops/token', t),
      AsyncStorage.setItem('@verde_ops/user', JSON.stringify(u)),
      AsyncStorage.setItem('@verde_ops/tenant', JSON.stringify(ten)),
      AsyncStorage.setItem('@verde_ops/tenant_id', ten.id),
    ])
    setToken(t)
    setUser(u)
    setTenant(ten)
  }

  const logout = async () => {
    await Promise.all([
      AsyncStorage.removeItem('@verde_ops/token'),
      AsyncStorage.removeItem('@verde_ops/user'),
      AsyncStorage.removeItem('@verde_ops/tenant'),
      AsyncStorage.removeItem('@verde_ops/tenant_id'),
    ])
    setToken(null)
    setUser(null)
    setTenant(null)
  }

  const switchTenant = async (ten: Tenant) => {
    await Promise.all([
      AsyncStorage.setItem('@verde_ops/tenant', JSON.stringify(ten)),
      AsyncStorage.setItem('@verde_ops/tenant_id', ten.id),
    ])
    setTenant(ten)
  }

  return (
    <AuthContext.Provider value={{ token, user, tenant, isLoading, login, logout, switchTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

export async function apiLogin(email: string, password: string) {
  return apiFetch<{ token: string; user: User; tenant: Tenant }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    skipTenant: true,
  })
}

export async function apiSignup(name: string, email: string, password: string, businessName: string) {
  return apiFetch<{ token: string; user: User; tenant: Tenant }>('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, businessName }),
    skipTenant: true,
  })
}
