import cors from 'cors'
import express, { type Request, type Response } from 'express'
import path from 'path'
import { authRouter } from './routes/auth.js'
import { billingRouter } from './routes/billing.js'
import { catalogRouter } from './routes/catalog.js'
import { crewsRouter } from './routes/crews.js'
import { customersRouter } from './routes/customers.js'
import { estimatesRouter } from './routes/estimates.js'
import { invoicesRouter } from './routes/invoices.js'
import { jobsRouter } from './routes/jobs.js'
import { leadsRouter } from './routes/leads.js'
import { photosRouter } from './routes/photos.js'
import { propertiesRouter } from './routes/properties.js'
import { paymentsRouter } from './routes/payments.js'
import { quoteRouter } from './routes/quote.js'
import { recurringPlansRouter } from './routes/recurringPlans.js'
import { inboxRouter } from './routes/inbox.js'
import { translateRouter } from './routes/translate.js'
import { webhooksRouter } from './routes/webhooks.js'
import {
  buildQuoteIntro,
  collections,
  crews,
  extraOptions,
  frequencyLabel,
  jobs,
  leads,
  merchantProfile,
  recurringPlans,
  quoteFallbackRecipient,
  quoteFallbackZone,
  quoteIncludesLabel,
  quoteInvoicePrompt,
  quoteNoExtrasLabel,
  quotePaymentPrompt,
  scheduleSlots,
  serviceDefinitions,
  translateText,
  type Frequency,
  type Language,
  type ServiceType,
  type Zone,
  zoneDefinitions,
} from './demo-data.js'

const app = express()
const port = Number(process.env.PORT || 4000)

const frequencyDiscount: Record<Frequency, number> = {
  semanal: -0.11,
  quincenal: -0.05,
  mensual: 0,
}

const visitsPerMonth: Record<Frequency, number> = {
  semanal: 4,
  quincenal: 2,
  mensual: 1,
}

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

type QuotePreviewBody = {
  language?: Language
  clientName?: string
  neighborhood?: string
  serviceType?: ServiceType
  frequency?: Frequency
  zone?: Zone
  area?: number
  requiresInvoice?: boolean
  selectedExtras?: string[]
  quoteCustomSpanish?: string
  quoteCustomEnglish?: string
}

const demoQuotePreset: Required<
  Pick<
    QuotePreviewBody,
    | 'clientName'
    | 'neighborhood'
    | 'serviceType'
    | 'frequency'
    | 'zone'
    | 'area'
    | 'requiresInvoice'
    | 'selectedExtras'
    | 'quoteCustomSpanish'
    | 'quoteCustomEnglish'
  >
> = {
  clientName: 'Casa Garza',
  neighborhood: 'San Jeronimo',
  serviceType: 'mantenimiento',
  frequency: 'semanal',
  zone: 'residencial',
  area: 320,
  requiresInvoice: false,
  selectedExtras: ['deshierbe', 'riego'],
  quoteCustomSpanish:
    'Puedo pasar manana entre 9 y 11 am y mandar evidencia por WhatsApp.',
  quoteCustomEnglish:
    'I can come by tomorrow between 9 and 11 am and send photo proof on WhatsApp.',
}

app.use(
  cors({
    origin: true,
  }),
)
// Webhooks must receive raw body for Stripe signature verification — mount before express.json()
app.use('/webhooks', express.raw({ type: '*/*' }), webhooksRouter)
app.use(express.json())
app.use('/uploads', express.static(process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')))
// Marketing landing page: serve backend/public at the site root (index.html at "/")
app.use(express.static(path.join(process.cwd(), 'public')))
app.use('/auth', authRouter)
app.use('/translate', translateRouter)
app.use('/inbox', inboxRouter)
// Short public link for the truck magnet: /q/<code>
app.get('/q/:code', (req, res) => res.redirect(302, `/inbox/page/${req.params.code}`))
app.use('/api/billing', billingRouter)
app.use('/api/catalog', catalogRouter)
app.use('/api/crews', crewsRouter)
app.use('/api/customers', customersRouter)
app.use('/api/estimates', estimatesRouter)
app.use('/api/invoices', invoicesRouter)
app.use('/api/jobs', jobsRouter)
app.use('/api/leads', leadsRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/photos', photosRouter)
app.use('/api/properties', propertiesRouter)
app.use('/api/quote', quoteRouter)
app.use('/api/recurring-plans', recurringPlansRouter)

function formatCurrency(value: number) {
  return currency.format(Math.round(value))
}

function ensureLanguage(value?: Language): Language {
  return value === 'en' || value === 'es' ? value : 'es'
}

function ensureFrequency(value?: Frequency): Frequency {
  return value === 'semanal' || value === 'quincenal' || value === 'mensual'
    ? value
    : 'quincenal'
}

function ensureZone(value?: Zone): Zone {
  return value === 'urbana' || value === 'residencial' || value === 'periferia'
    ? value
    : 'residencial'
}

function ensureServiceType(value?: ServiceType): ServiceType {
  return value === 'mantenimiento' || value === 'paisajismo' || value === 'poda'
    ? value
    : 'mantenimiento'
}

function buildQuoteResponse(body: QuotePreviewBody) {
  const language = ensureLanguage(body.language)
  const serviceType = ensureServiceType(body.serviceType)
  const frequency = ensureFrequency(body.frequency)
  const zone = ensureZone(body.zone)
  const area = Number.isFinite(body.area) ? Math.max(50, Number(body.area)) : 240
  const requiresInvoice = Boolean(body.requiresInvoice)
  const selectedExtras = Array.isArray(body.selectedExtras) ? body.selectedExtras : []

  const service = serviceDefinitions.find((item) => item.id === serviceType)
  if (!service) {
    throw new Error('Unknown service type')
  }

  const zoneDefinition = zoneDefinitions[zone]
  const extras = extraOptions.filter((item) => selectedExtras.includes(item.id))
  const quoteBase = service.base + area * service.sqmRate + zoneDefinition.fee
  const quoteExtrasTotal = extras.reduce((sum, item) => sum + item.price, 0)
  const quoteDiscount =
    serviceType === 'mantenimiento'
      ? Math.round(quoteBase * frequencyDiscount[frequency])
      : 0
  const quoteTotal = Math.max(quoteBase + quoteExtrasTotal + quoteDiscount, 1200)
  const quoteDeposit = Math.round(
    quoteTotal * (serviceType === 'mantenimiento' ? 0.2 : 0.38),
  )
  const quoteMonthlyPlan =
    serviceType === 'mantenimiento'
      ? Math.round(quoteTotal * visitsPerMonth[frequency])
      : 0
  const quoteHours =
    service.hours +
    area / (serviceType === 'paisajismo' ? 78 : 130) +
    extras.length * 0.7
  const recipient = body.clientName?.trim() || quoteFallbackRecipient(language)
  const zoneName = body.neighborhood?.trim() || quoteFallbackZone(language)

  const buildQuoteMessage = (messageLanguage: Language) => {
    const rawCustomNote =
      messageLanguage === 'es'
        ? body.quoteCustomSpanish?.trim()
        : body.quoteCustomEnglish?.trim()
    const customNote = rawCustomNote?.replace(/[.!?]+$/, '')

    return [
      buildQuoteIntro(
        messageLanguage,
        recipient,
        translateText(service.label, messageLanguage),
        zoneName,
      ),
      `${messageLanguage === 'es' ? 'Superficie estimada' : 'Estimated area'}: ${area} m2.`,
      `${quoteIncludesLabel(messageLanguage)}: ${translateText(
        service.detail,
        messageLanguage,
      )}`,
      extras.length > 0
        ? `${messageLanguage === 'es' ? 'Extras' : 'Extras'}: ${extras
            .map((item) => translateText(item.label, messageLanguage).toLowerCase())
            .join(', ')}.`
        : quoteNoExtrasLabel(messageLanguage),
      `${messageLanguage === 'es' ? 'Total estimado' : 'Total estimate'}: ${formatCurrency(
        quoteTotal,
      )}.`,
      `${messageLanguage === 'es' ? 'Anticipo sugerido' : 'Suggested deposit'}: ${formatCurrency(
        quoteDeposit,
      )}.`,
      requiresInvoice
        ? quoteInvoicePrompt(messageLanguage)
        : quotePaymentPrompt(messageLanguage),
      customNote
        ? `${messageLanguage === 'es' ? 'Nota' : 'Note'}: ${customNote}.`
        : null,
      merchantProfile.quoteClosing[messageLanguage],
    ]
      .filter(Boolean)
      .join(' ')
  }

  return {
    merchant: merchantProfile,
    language,
    serviceType,
    frequency,
    zone,
    area,
    requiresInvoice,
    totals: {
      base: quoteBase,
      extras: quoteExtrasTotal,
      discount: quoteDiscount,
      total: quoteTotal,
      deposit: quoteDeposit,
      monthlyPlan: quoteMonthlyPlan,
    },
    formatted: {
      base: formatCurrency(quoteBase),
      extras: formatCurrency(quoteExtrasTotal),
      discount: formatCurrency(quoteDiscount),
      total: formatCurrency(quoteTotal),
      deposit: formatCurrency(quoteDeposit),
      monthlyPlan: formatCurrency(quoteMonthlyPlan),
    },
    crew: translateText(service.crew, language),
    zoneLabel: translateText(zoneDefinition.label, language),
    zoneNote: translateText(zoneDefinition.note, language),
    frequencyLabel: frequencyLabel(language, frequency),
    estimatedHours: Number(quoteHours.toFixed(1)),
    extras: extras.map((item) => ({
      id: item.id,
      label: item.label,
      detail: item.detail,
      price: item.price,
    })),
    messages: {
      es: buildQuoteMessage('es'),
      en: buildQuoteMessage('en'),
    },
  }
}

app.get('/health', (_request: Request, response: Response) => {
  response.json({
    ok: true,
    service: 'gutierrez-verde-backend',
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/merchant', (_request: Request, response: Response) => {
  response.json({
    merchant: merchantProfile,
    supportedLanguages: ['es', 'en'],
  })
})

app.get('/api/reference', (_request: Request, response: Response) => {
  response.json({
    services: serviceDefinitions,
    extras: extraOptions,
    zones: zoneDefinitions,
    crews,
  })
})

app.get('/api/demo/preset', (_request: Request, response: Response) => {
  const todayRevenue = jobs.reduce((sum, job) => sum + job.amount, 0)
  const evidencePending = jobs.filter(
    (job) => job.beforePhotos === 0 || job.afterPhotos === 0,
  ).length
  const pipelineValue = leads.reduce((sum, lead) => sum + lead.value, 0)
  const totalCollections = collections.reduce((sum, item) => sum + item.amount, 0)

  response.json({
    merchant: merchantProfile,
    demoMode: true,
    quotePreset: demoQuotePreset,
    schedulePreset: {
      client: 'Casa Garza',
      crewId: crews[0].id,
      dayId: scheduleSlots[0]?.dayId,
      time: '09:00',
      recurring: true,
      frequency: 'semanal',
    },
    featureSummary: {
      todayRevenue: formatCurrency(todayRevenue),
      evidencePending,
      totalCollections: formatCurrency(totalCollections),
      pipelineValue: formatCurrency(pipelineValue),
      activeJobs: jobs.length,
      recurringPlans: recurringPlans.length,
    },
  })
})

app.post('/api/quotes/preview', (request: Request, response: Response) => {
  try {
    response.json(buildQuoteResponse(request.body as QuotePreviewBody))
  } catch (error) {
    response.status(400).json({
      error: error instanceof Error ? error.message : 'Could not build quote preview',
    })
  }
})

app.listen(port, () => {
  console.log(`Cuadrilla backend listening on :${port}`)
})
