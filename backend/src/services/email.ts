import { Resend } from 'resend'

const FROM = process.env.EMAIL_FROM ?? 'Verde Ops <noreply@example.com>'

let resend: Resend | null = null

function getClient() {
  if (!process.env.RESEND_API_KEY) return null
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  const client = getClient()
  if (!client) {
    console.warn('[Email] Resend not configured — skipping email to', to)
    return
  }
  try {
    await client.emails.send({ from: FROM, to, subject, html })
  } catch (err) {
    console.error('[Email] Failed to send to', to, err)
  }
}
