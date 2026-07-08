import { useState } from 'react'
import { type LeadStage } from '../data'

export function useCrmState() {
  const [leadFilter, setLeadFilter] = useState<LeadStage | 'todas'>('todas')

  const resetCrmState = () => {
    setLeadFilter('todas')
  }

  return { leadFilter, setLeadFilter, resetCrmState }
}
