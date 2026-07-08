import { View, Text } from 'react-native'
import styles from '../styles/shared'

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'neutral'

export function TonePill({ label, tone }: { label: string; tone: Tone }) {
  const toneStyle =
    tone === 'green'
      ? styles.pillGreen
      : tone === 'amber'
        ? styles.pillAmber
        : tone === 'red'
          ? styles.pillRed
          : tone === 'blue'
            ? styles.pillBlue
            : styles.pillNeutral

  return (
    <View style={[styles.pill, toneStyle]}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  )
}
