import { useState } from 'react'
import { type Frequency, type ServiceType, type Zone } from '../data'

export function useQuoteState() {
  const [clientName, setClientName] = useState('')
  const [clientNeighborhood, setClientNeighborhood] = useState('')
  const [serviceType, setServiceType] = useState<ServiceType>('mantenimiento')
  const [frequency, setFrequency] = useState<Frequency>('quincenal')
  const [zone, setZone] = useState<Zone>('residencial')
  const [area, setArea] = useState(240)
  const [requiresInvoice, setRequiresInvoice] = useState(false)
  const [selectedExtras, setSelectedExtras] = useState<string[]>(['deshierbe', 'retiro'])
  const [quoteCustomSpanish, setQuoteCustomSpanish] = useState('')
  const [quoteCustomEnglish, setQuoteCustomEnglish] = useState('')

  const handleExtraToggle = (extraId: string) => {
    setSelectedExtras((current) =>
      current.includes(extraId)
        ? current.filter((item) => item !== extraId)
        : [...current, extraId],
    )
  }

  const resetQuoteState = () => {
    setClientName('')
    setClientNeighborhood('')
    setServiceType('mantenimiento')
    setFrequency('quincenal')
    setZone('residencial')
    setArea(240)
    setRequiresInvoice(false)
    setSelectedExtras(['deshierbe', 'retiro'])
    setQuoteCustomSpanish('')
    setQuoteCustomEnglish('')
  }

  return {
    clientName,
    setClientName,
    clientNeighborhood,
    setClientNeighborhood,
    serviceType,
    setServiceType,
    frequency,
    setFrequency,
    zone,
    setZone,
    area,
    setArea,
    requiresInvoice,
    setRequiresInvoice,
    selectedExtras,
    setSelectedExtras,
    quoteCustomSpanish,
    setQuoteCustomSpanish,
    quoteCustomEnglish,
    setQuoteCustomEnglish,
    handleExtraToggle,
    resetQuoteState,
  }
}
