import type { ComponentProps } from 'react'
import { View, Text } from 'react-native'
import { Feather } from '@expo/vector-icons'
import styles from '../styles/shared'

type Tone = 'green' | 'amber' | 'red' | 'blue'

export function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ComponentProps<typeof Feather>['name']
  label: string
  value: string
  detail: string
  tone: Tone
}) {
  const toneContainer =
    tone === 'green'
      ? styles.metricIconGreen
      : tone === 'amber'
        ? styles.metricIconAmber
        : tone === 'red'
          ? styles.metricIconRed
          : styles.metricIconBlue

  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricIcon, toneContainer]}>
        <Feather name={icon} size={16} color="#17211b" />
      </View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricDetail}>{detail}</Text>
    </View>
  )
}
