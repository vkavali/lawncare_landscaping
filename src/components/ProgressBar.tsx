import { View } from 'react-native'
import styles from '../styles/shared'

export function ProgressBar({ value }: { value: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(value, 100)}%` }]} />
    </View>
  )
}
