const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

export function formatCurrency(value: number) {
  return currency.format(Math.round(value))
}

export function formatNumber(value: number) {
  return value.toLocaleString('es-MX')
}
