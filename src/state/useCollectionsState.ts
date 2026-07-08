import { useState } from 'react'

export function useCollectionsState() {
  const [invoiceOnly, setInvoiceOnly] = useState(false)

  const resetCollectionsState = () => {
    setInvoiceOnly(false)
  }

  return { invoiceOnly, setInvoiceOnly, resetCollectionsState }
}
