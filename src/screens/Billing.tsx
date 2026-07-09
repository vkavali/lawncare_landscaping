import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SectionCard } from '../components/SectionCard'
import { TonePill } from '../components/TonePill'
import { apiFetch } from '../api/client'
import type { Language } from '../data'
import { palette } from '../styles/theme'
import styles from '../styles/shared'

interface SubscriptionInfo {
  tier: 'FREE' | 'PRO' | 'TEAM'
  plan_status: string
  trial_ends_at: string | null
  next_billing_date: string | null
  has_subscription?: boolean
}

interface BillingScreenProps {
  language: Language
}

const PLAN_LABELS: Record<string, string> = {
  FREE: 'Free',
  PRO: 'Pro',
  TEAM: 'Team',
}

const STATUS_TONE: Record<string, 'green' | 'amber' | 'red' | 'neutral'> = {
  active: 'green',
  trialing: 'amber',
  past_due: 'red',
  canceled: 'red',
  trialing_expired: 'red',
}

function statusLabel(status: string): string {
  switch (status) {
    case 'active': return 'Active'
    case 'trialing': return 'Free Trial'
    case 'past_due': return 'Past Due'
    case 'canceled': return 'Canceled'
    default: return status
  }
}

export function BillingScreen({ language }: BillingScreenProps) {
  const [info, setInfo] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [upgrading, setUpgrading] = useState(false)
  const [managing, setManaging] = useState(false)
  const [connecting, setConnecting] = useState(false)

  useEffect(() => {
    apiFetch<SubscriptionInfo>('/api/billing/subscription')
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false))
  }, [])

  async function handleUpgrade(tier: 'pro' | 'team') {
    setUpgrading(true)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/checkout', {
        method: 'POST',
        body: JSON.stringify({ tier }),
      })
      if (url) await Linking.openURL(url)
    } catch (err) {
      Alert.alert(
        'Checkout unavailable',
        err instanceof Error ? err.message : 'Could not start checkout. Try again.',
      )
    } finally {
      setUpgrading(false)
    }
  }

  async function handleManage() {
    setManaging(true)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/portal', { method: 'POST' })
      if (url) await Linking.openURL(url)
    } catch (err) {
      Alert.alert(
        'Portal unavailable',
        err instanceof Error ? err.message : 'Could not open billing portal.',
      )
    } finally {
      setManaging(false)
    }
  }

  async function handleConnectOnboard() {
    setConnecting(true)
    try {
      const { url } = await apiFetch<{ url: string }>('/api/billing/connect/onboard', {
        method: 'POST',
      })
      if (url) await Linking.openURL(url)
    } catch (err) {
      Alert.alert(
        'Connect unavailable',
        err instanceof Error ? err.message : 'Could not start Connect onboarding.',
      )
    } finally {
      setConnecting(false)
    }
  }

  const trialDaysLeft = info?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(info.trial_ends_at).getTime() - Date.now()) / 86_400_000))
    : null

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <ActivityIndicator color={palette.green} />
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={{ gap: 16, paddingBottom: 24 }}>
      {/* Plan Overview */}
      <SectionCard
        title={language === 'es' ? 'Tu Plan' : 'Your Plan'}
        subtitle={language === 'es' ? 'Suscripción SaaS' : 'SaaS Subscription'}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ fontSize: 28, fontWeight: '800', color: palette.green }}>
              {PLAN_LABELS[info?.tier ?? 'FREE']}
            </Text>
            <Text style={{ fontSize: 13, color: palette.muted, marginTop: 2 }}>
              {language === 'es' ? 'Plan actual' : 'Current plan'}
            </Text>
          </View>
          <TonePill
            label={statusLabel(info?.plan_status ?? 'trialing')}
            tone={STATUS_TONE[info?.plan_status ?? 'trialing'] ?? 'neutral'}
          />
        </View>

        {info?.plan_status === 'trialing' && trialDaysLeft !== null && (
          <View style={{
            backgroundColor: palette.amberSoft,
            borderRadius: 10,
            padding: 12,
            marginBottom: 12,
          }}>
            <Text style={{ color: palette.amber, fontWeight: '600', fontSize: 13 }}>
              {trialDaysLeft > 0
                ? `${trialDaysLeft} ${language === 'es' ? 'días de prueba restantes' : 'trial days remaining'}`
                : (language === 'es' ? 'Tu prueba venció' : 'Your trial has expired')}
            </Text>
          </View>
        )}

        {info?.next_billing_date && (
          <Text style={{ fontSize: 12, color: palette.subtle, marginBottom: 12 }}>
            {language === 'es' ? 'Próximo cobro: ' : 'Next billing: '}
            {new Date(info.next_billing_date).toLocaleDateString(
              language === 'es' ? 'es-US' : 'en-US',
              { month: 'long', day: 'numeric', year: 'numeric' },
            )}
          </Text>
        )}

        {/* Upgrade buttons (shown when not on Team or not active) */}
        {(info?.tier === 'FREE' || info?.plan_status !== 'active') && (
          <View style={{ gap: 8 }}>
            {info?.tier !== 'PRO' && (
              <ActionButton
                label={language === 'es' ? 'Activar Pro — $49/mes' : 'Upgrade to Pro — $49/mo'}
                icon="zap"
                loading={upgrading}
                onPress={() => handleUpgrade('pro')}
                primary
              />
            )}
            {info?.tier !== 'TEAM' && (
              <ActionButton
                label={language === 'es' ? 'Activar Team — $99/mes' : 'Upgrade to Team — $99/mo'}
                icon="users"
                loading={upgrading}
                onPress={() => handleUpgrade('team')}
              />
            )}
          </View>
        )}

        {/* Manage (shown when on paid plan) */}
        {info && info.tier !== 'FREE' && (
          <ActionButton
            label={language === 'es' ? 'Administrar suscripción' : 'Manage subscription'}
            icon="settings"
            loading={managing}
            onPress={handleManage}
          />
        )}
      </SectionCard>

      {/* Stripe Connect */}
      <SectionCard
        title={language === 'es' ? 'Cobros con Tarjeta' : 'Card Payments'}
        subtitle={language === 'es' ? 'Recibe pagos de clientes' : 'Collect payments from customers'}
      >
        <Text style={{ fontSize: 13, color: palette.muted, marginBottom: 12, lineHeight: 20 }}>
          {language === 'es'
            ? 'Conecta una cuenta Stripe para cobrar con tarjeta directamente en la app. Verde Ops retiene 2% de comisión.'
            : 'Connect a Stripe account to charge cards in-app. Verde Ops takes a 2% platform fee.'}
        </Text>
        <ActionButton
          label={language === 'es' ? 'Configurar cobros con tarjeta' : 'Set up card payments'}
          icon="credit-card"
          loading={connecting}
          onPress={handleConnectOnboard}
        />
      </SectionCard>

      {/* Pricing tiers info */}
      <SectionCard
        title={language === 'es' ? 'Planes' : 'Plans'}
        subtitle={language === 'es' ? 'Qué incluye cada plan' : "What's included"}
      >
        {[
          {
            name: 'Pro',
            price: '$49/mo',
            features: language === 'es'
              ? ['Hasta 3 cuadrillas', 'Estimados ilimitados', 'Cobros en línea', 'SMS automáticos']
              : ['Up to 3 crews', 'Unlimited estimates', 'Online payments', 'Automated SMS'],
          },
          {
            name: 'Team',
            price: '$99/mo',
            features: language === 'es'
              ? ['Cuadrillas ilimitadas', 'Usuarios ilimitados', 'Reportes avanzados', 'Soporte prioritario']
              : ['Unlimited crews', 'Unlimited users', 'Advanced reports', 'Priority support'],
          },
        ].map((plan) => (
          <View
            key={plan.name}
            style={{
              backgroundColor: palette.canvas,
              borderRadius: 12,
              padding: 14,
              marginBottom: 10,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontWeight: '700', color: palette.ink, fontSize: 15 }}>{plan.name}</Text>
              <Text style={{ fontWeight: '700', color: palette.green, fontSize: 15 }}>{plan.price}</Text>
            </View>
            {plan.features.map((f) => (
              <View key={f} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                <Feather name="check" size={13} color={palette.green} style={{ marginTop: 2 }} />
                <Text style={{ fontSize: 13, color: palette.muted }}>{f}</Text>
              </View>
            ))}
          </View>
        ))}
      </SectionCard>
    </ScrollView>
  )
}

function ActionButton({
  label,
  icon,
  loading,
  onPress,
  primary = false,
}: {
  label: string
  icon: string
  loading: boolean
  onPress: () => void
  primary?: boolean
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: primary ? palette.green : palette.greenSoft,
        opacity: pressed || loading ? 0.7 : 1,
      })}
    >
      {loading ? (
        <ActivityIndicator size="small" color={primary ? palette.white : palette.green} />
      ) : (
        <Feather name={icon as any} size={15} color={primary ? palette.white : palette.green} />
      )}
      <Text
        style={{
          fontWeight: '600',
          fontSize: 14,
          color: primary ? palette.white : palette.green,
        }}
      >
        {label}
      </Text>
    </Pressable>
  )
}
