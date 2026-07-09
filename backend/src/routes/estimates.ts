import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import { requireActivePlan } from '../middleware/requireActivePlan.js'
import { sendEmail } from '../services/email.js'
import { sendSms } from '../services/twilio.js'
import { generatePdf } from '../services/pdf.js'
import { estimateSentEmail } from '../templates/email.js'
import { estimateSentSms } from '../templates/sms.js'

export const estimatesRouter = Router()
estimatesRouter.use(requireAuth, requireTenant)

const LineSchema = z.object({
  serviceId: z.string().cuid().optional(),
  description: z.string().min(1).max(500),
  descriptionEs: z.string().max(500).optional(),
  qty: z.number().int().positive().default(1),
  unitCents: z.number().int().nonnegative(),
})

const EstimateSchema = z.object({
  customerId: z.string().cuid().optional(),
  depositCents: z.number().int().nonnegative().optional(),
  validUntil: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(LineSchema).min(1),
})

estimatesRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { status, customerId } = req.query as { status?: string; customerId?: string }
  const estimates = await prisma.estimate.findMany({
    where: {
      tenantId,
      ...(status ? { status: status as any } : {}),
      ...(customerId ? { customerId } : {}),
    },
    include: { lines: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: estimates })
})

estimatesRouter.post('/', requireActivePlan, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = EstimateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const { lines, ...rest } = parsed.data
  const totalCents = lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0)
  const estimate = await prisma.estimate.create({
    data: {
      tenantId,
      ...rest,
      ...(rest.validUntil ? { validUntil: new Date(rest.validUntil) } : {}),
      totalCents,
      lines: { create: lines.map((l) => ({ ...l, totalCents: l.qty * l.unitCents })) },
    },
    include: { lines: true },
  })
  res.status(201).json({ data: estimate })
})

estimatesRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const estimate = await prisma.estimate.findFirst({
    where: { id: req.params.id, tenantId },
    include: { lines: true },
  })
  if (!estimate) { res.status(404).json({ error: 'Estimate not found' }); return }
  res.json({ data: estimate })
})

estimatesRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.estimate.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Estimate not found' }); return }
  const UpdateSchema = z.object({
    status: z.enum(['DRAFT','SENT','ACCEPTED','DECLINED','EXPIRED']).optional(),
    depositCents: z.number().int().nonnegative().optional(),
    validUntil: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
  })
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const estimate = await prisma.estimate.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.validUntil ? { validUntil: new Date(data.validUntil) } : {}) },
  })
  res.json({ data: estimate })
})

// POST /api/estimates/:id/send  — marks SENT, emails PDF, SMS link
estimatesRouter.post('/:id/send', requireActivePlan, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest

  const [existing, tenant] = await Promise.all([
    prisma.estimate.findFirst({
      where: { id: req.params.id, tenantId },
      include: { lines: true, customer: { select: { name: true, email: true, phone: true, sms_opt_out: true, email_opt_out: true } } },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])

  if (!existing) { res.status(404).json({ error: 'Estimate not found' }); return }
  if (existing.status !== 'DRAFT') {
    res.status(400).json({ error: `Estimate is already ${existing.status}` }); return
  }

  const estimate = await prisma.estimate.update({
    where: { id: req.params.id },
    data: { status: 'SENT', sentAt: new Date() },
  })

  res.json({ data: estimate })

  // Fire-and-forget delivery
  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:8081'
  const viewUrl = `${FRONTEND_URL}/estimates/${existing.id}`
  const clientName = existing.customer?.name ?? 'Customer'
  const businessName = tenant?.name ?? 'Verde Ops'
  const totalFormatted = `$${(existing.totalCents / 100).toFixed(2)}`

  try {
    if (existing.customer?.email && !existing.customer.email_opt_out) {
      const pdfBuffer = await generatePdf({
        type: 'estimate',
        number: existing.id.slice(-8).toUpperCase(),
        businessName,
        clientName,
        clientEmail: existing.customer.email,
        date: new Date(),
        lines: existing.lines.map((l) => ({
          description: l.description,
          qty: l.qty,
          unitCents: l.unitCents,
          totalCents: l.totalCents,
        })),
        totalCents: existing.totalCents,
        notes: existing.notes ?? undefined,
      })
      // Attach PDF via Resend attachments
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const FROM = process.env.EMAIL_FROM ?? 'Verde Ops <noreply@example.com>'
      const { subject, html } = estimateSentEmail('en', clientName, businessName, totalFormatted, viewUrl)
      await resend.emails.send({
        from: FROM,
        to: existing.customer.email,
        subject,
        html,
        attachments: [{ filename: `estimate-${existing.id.slice(-8)}.pdf`, content: pdfBuffer }],
      })
    }

    if (existing.customer?.phone && !existing.customer.sms_opt_out) {
      const smsBody = estimateSentSms('en', clientName, existing.totalCents, viewUrl)
      await sendSms(existing.customer.phone, smsBody)
    }
  } catch (err) {
    console.error('[Estimate/send] Delivery error:', err)
  }
})
