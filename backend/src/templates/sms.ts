const BRAND = 'Verde Ops'

type Lang = 'en' | 'es'

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

export function jobScheduledSms(lang: Lang, clientName: string, scheduledAt: Date): string {
  const date = scheduledAt.toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  const time = scheduledAt.toLocaleTimeString(lang === 'es' ? 'es-US' : 'en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })
  return lang === 'es'
    ? `Hola ${clientName}, tu servicio de ${BRAND} está programado para el ${date} a las ${time}. Responde STOP para no recibir mensajes.`
    : `Hi ${clientName}, your ${BRAND} service is scheduled for ${date} at ${time}. Reply STOP to opt out.`
}

export function jobEnRouteSms(lang: Lang, clientName: string): string {
  return lang === 'es'
    ? `Hola ${clientName}, tu equipo de ${BRAND} está en camino. ¡Nos vemos pronto!`
    : `Hi ${clientName}, your ${BRAND} crew is on the way! See you soon.`
}

export function jobOnSiteSms(lang: Lang, clientName: string): string {
  return lang === 'es'
    ? `Hola ${clientName}, tu equipo de ${BRAND} llegó y comenzó a trabajar.`
    : `Hi ${clientName}, your ${BRAND} crew has arrived and started working.`
}

export function jobCompletedSms(lang: Lang, clientName: string): string {
  return lang === 'es'
    ? `¡Listo, ${clientName}! Tu servicio de ${BRAND} está terminado. ¡Gracias!`
    : `All done, ${clientName}! Your ${BRAND} service is complete. Thank you!`
}

export function invoiceSentSms(
  lang: Lang,
  clientName: string,
  invoiceNumber: string,
  totalCents: number,
  viewUrl: string,
): string {
  const amount = fmt(totalCents)
  return lang === 'es'
    ? `Hola ${clientName}, tu factura #${invoiceNumber} por ${amount} de ${BRAND} está lista: ${viewUrl}`
    : `Hi ${clientName}, your invoice #${invoiceNumber} for ${amount} from ${BRAND} is ready: ${viewUrl}`
}

export function paymentReminderSms(
  lang: Lang,
  clientName: string,
  balanceCents: number,
): string {
  const amount = fmt(balanceCents)
  return lang === 'es'
    ? `Hola ${clientName}, recordatorio de ${BRAND}: tienes un saldo pendiente de ${amount}. ¿Necesitas ayuda? Responde a este mensaje.`
    : `Hi ${clientName}, reminder from ${BRAND}: you have a balance of ${amount} due. Questions? Reply to this message.`
}

export function thankYouSms(lang: Lang, clientName: string): string {
  return lang === 'es'
    ? `¡Gracias por tu pago, ${clientName}! ${BRAND} aprecia tu confianza. ¡Hasta la próxima!`
    : `Thank you for your payment, ${clientName}! ${BRAND} appreciates your business. See you next time!`
}

export function estimateSentSms(
  lang: Lang,
  clientName: string,
  totalCents: number,
  viewUrl: string,
): string {
  const amount = fmt(totalCents)
  return lang === 'es'
    ? `Hola ${clientName}, ${BRAND} te envió una cotización por ${amount}: ${viewUrl}`
    : `Hi ${clientName}, ${BRAND} sent you an estimate for ${amount}: ${viewUrl}`
}
