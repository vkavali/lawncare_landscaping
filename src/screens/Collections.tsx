import { useState } from 'react'
import { Feather } from '@expo/vector-icons'
import { ActivityIndicator, Alert, Pressable, Switch, Text, View } from 'react-native'
import { SectionCard } from '../components/SectionCard'
import { TonePill } from '../components/TonePill'
import {
  collections,
  quickTemplates,
  translateText,
  type CollectionItem,
  type Language,
} from '../data'
import { buildCollectionReminderMessage, type getTranslation } from '../i18n'
import styles from '../styles/shared'
import { palette } from '../styles/theme'
import { formatCurrency } from '../utils/format'
import { apiFetch } from '../api/client'

function getToneForRisk(risk: CollectionItem['risk']) {
  switch (risk) {
    case 'alta': return 'red'
    case 'media': return 'amber'
    case 'baja': return 'green'
  }
}

interface CollectionsScreenProps {
  language: Language
  copy: ReturnType<typeof getTranslation>
  invoiceOnly: boolean
  setInvoiceOnly: (v: boolean) => void
  openWhatsApp: (message: string) => void
}

export function CollectionsScreen({
  language,
  copy,
  invoiceOnly,
  setInvoiceOnly,
  openWhatsApp,
}: CollectionsScreenProps) {
  const [chargingId, setChargingId] = useState<string | null>(null)

  const filteredCollections = invoiceOnly
    ? collections.filter((item) => item.invoice)
    : collections
  const totalCollections = collections.reduce((sum, item) => sum + item.amount, 0)

  async function handleChargeCard(item: CollectionItem) {
    if (!item.invoice) {
      Alert.alert(
        language === 'es' ? 'Sin factura' : 'No invoice',
        language === 'es'
          ? 'Genera una factura primero para cobrar con tarjeta.'
          : 'Create an invoice first to charge a card.',
      )
      return
    }
    Alert.alert(
      language === 'es' ? 'Cobrar con tarjeta' : 'Charge card',
      language === 'es'
        ? `¿Cobrar ${formatCurrency(item.amount)} a ${item.client}?`
        : `Charge ${formatCurrency(item.amount)} to ${item.client}?`,
      [
        { text: language === 'es' ? 'Cancelar' : 'Cancel', style: 'cancel' },
        {
          text: language === 'es' ? 'Cobrar' : 'Charge',
          style: 'destructive',
          onPress: async () => {
            setChargingId(item.id)
            try {
              // item.id used as placeholder; in production pass real invoice_id
              await apiFetch('/api/payments/intent', {
                method: 'POST',
                body: JSON.stringify({ invoice_id: item.id }),
              })
              Alert.alert(
                language === 'es' ? '¡Cobro iniciado!' : 'Charge initiated',
                language === 'es'
                  ? 'Se está procesando el pago con tarjeta.'
                  : 'Card payment is being processed.',
              )
            } catch (err) {
              Alert.alert(
                language === 'es' ? 'Error' : 'Error',
                err instanceof Error ? err.message : 'Could not create payment intent.',
              )
            } finally {
              setChargingId(null)
            }
          },
        },
      ],
    )
  }

  return (
    <>
      <SectionCard
        title={copy.sections.collectionsTitle}
        subtitle={copy.sections.collectionsSubtitle}
      >
        <View style={styles.collectionTopRow}>
          <View>
            <Text style={styles.sectionTitle}>{copy.collections.pendingToCollect}</Text>
            <Text style={styles.collectionTotal}>{formatCurrency(totalCollections)}</Text>
          </View>
          <View style={styles.switchInline}>
            <Text style={styles.switchInlineText}>{copy.collections.invoiceOnly}</Text>
            <Switch
              value={invoiceOnly}
              onValueChange={setInvoiceOnly}
              trackColor={{ false: '#c8c2b4', true: '#99c2b3' }}
              thumbColor="#ffffff"
            />
          </View>
        </View>

        {filteredCollections.map((item) => (
          <View key={item.id} style={styles.listCard}>
            <View style={styles.listHeader}>
              <View style={styles.listHeaderMain}>
                <Text style={styles.listTitle}>{item.client}</Text>
                <Text style={styles.listSubtitle}>
                  {translateText(item.due, language)} · {copy.statuses.payment[item.payment]}
                </Text>
              </View>
              <TonePill
                label={copy.statuses.risk[item.risk]}
                tone={getToneForRisk(item.risk)}
              />
            </View>
            <Text style={styles.collectionAmount}>{formatCurrency(item.amount)}</Text>
            <Text style={styles.footnote}>{translateText(item.note, language)}</Text>
            <View style={styles.actionRow}>
              <Pressable
                style={styles.smallAction}
                onPress={() =>
                  openWhatsApp(
                    buildCollectionReminderMessage(
                      language,
                      item.client,
                      translateText(quickTemplates.reminder, language),
                      formatCurrency(item.amount),
                    ),
                  )
                }
              >
                <Feather name="send" size={14} color="#17211b" />
                <Text style={styles.smallActionText}>{copy.collections.remind}</Text>
              </Pressable>
              <Pressable
                style={styles.smallAction}
                onPress={() =>
                  Alert.alert(
                    copy.alerts.invoiceTitle,
                    item.invoice ? copy.alerts.invoiceText : copy.alerts.noInvoiceText,
                  )
                }
              >
                <Feather name="file-text" size={14} color="#17211b" />
                <Text style={styles.smallActionText}>{copy.collections.invoiceChecklist}</Text>
              </Pressable>
              <Pressable
                style={[styles.smallAction, { backgroundColor: palette.greenSoft }]}
                onPress={() => handleChargeCard(item)}
                disabled={chargingId === item.id}
              >
                {chargingId === item.id ? (
                  <ActivityIndicator size="small" color={palette.green} />
                ) : (
                  <Feather name="credit-card" size={14} color={palette.green} />
                )}
                <Text style={[styles.smallActionText, { color: palette.green }]}>
                  {language === 'es' ? 'Cobrar' : 'Charge'}
                </Text>
              </Pressable>
            </View>
          </View>
        ))}
      </SectionCard>
    </>
  )
}
