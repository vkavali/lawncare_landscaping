import twilio from 'twilio'

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const FROM_NUMBER = process.env.TWILIO_FROM_NUMBER ?? ''

let client: ReturnType<typeof twilio> | null = null

function getClient() {
  if (!ACCOUNT_SID || !AUTH_TOKEN) return null
  if (!client) client = twilio(ACCOUNT_SID, AUTH_TOKEN)
  return client
}

export async function sendSms(to: string, body: string): Promise<void> {
  const c = getClient()
  if (!c || !FROM_NUMBER) {
    console.warn('[SMS] Twilio not configured — skipping SMS to', to)
    return
  }
  try {
    await c.messages.create({ body, from: FROM_NUMBER, to })
  } catch (err) {
    console.error('[SMS] Failed to send to', to, err)
  }
}
