import { Router } from 'express'
import { z } from 'zod'

export const translateRouter = Router()

const bodySchema = z.object({
  text: z.string().min(1).max(2000),
  from: z.enum(['en', 'es']),
  to: z.enum(['en', 'es']),
})

const DEEPL_LANG: Record<'en' | 'es', string> = { en: 'EN-US', es: 'ES' }

/**
 * POST /translate
 *
 * Real machine translation between English and Spanish, used by the field app so a
 * note dictated in one language reaches the customer (or the crew) in the other.
 *
 * If no provider key is configured we return the original text with translated:false
 * rather than silently handing back an untranslated string that looks translated.
 */
translateRouter.post('/', async (req, res) => {
  const parsed = bodySchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() })
  }

  const { text, from, to } = parsed.data
  if (from === to) {
    return res.json({ text, translated: true })
  }

  const key = process.env.DEEPL_API_KEY
  if (!key) {
    return res.json({ text, translated: false, reason: 'no_provider' })
  }

  // Free keys end in ":fx" and live on a different host.
  const host = key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'

  try {
    const response = await fetch(`${host}/v2/translate`, {
      method: 'POST',
      headers: {
        Authorization: `DeepL-Auth-Key ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: [text],
        source_lang: from.toUpperCase(),
        target_lang: DEEPL_LANG[to],
      }),
    })

    if (!response.ok) {
      const detail = await response.text()
      console.error('[translate] provider error', response.status, detail)
      return res.json({ text, translated: false, reason: 'provider_error' })
    }

    const json = (await response.json()) as { translations?: { text: string }[] }
    const translated = json.translations?.[0]?.text
    if (!translated) {
      return res.json({ text, translated: false, reason: 'empty_response' })
    }

    return res.json({ text: translated, translated: true })
  } catch (error) {
    console.error('[translate] failed', error)
    return res.json({ text, translated: false, reason: 'network_error' })
  }
})
