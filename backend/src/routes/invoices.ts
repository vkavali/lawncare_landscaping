import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import { requireActivePlan } from '../middleware/requireActivePlan.js'
import { sendEmail } from '../services/email.js'
import { sendSms } from '../services/twilio.js'
import { generatePdf } from '../services/pdf.js'
import { invoiceSentEmail } from '../templates/email.js'
import { invoiceSentSms } from '../templates/sms.js'

export const invoicesRouter = Router()
invoicesRouter.use(requireAuth, requireTenant)

const InvoiceSchema = z.object({
  customerId: z.string().cuid().optional(),
  jobId: z.string().cuid().optional(),
  estimateId: z.string().cuid().optional(),
  number: z.string().min(1).max(50),
  totalCents: z.number().int().nonnegative(),
  dueCents: z.number().int().nonnegative().optional(),
  dueDate: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
})

invoicesRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { status, customerId } = req.query as { status?: string; customerId?: string }
  const invoices = await prisma.invoice.findMany({
    where: {
      tenantId,
      ...(status ? { status: status as any } : {}),
      ...(customerId ? { customerId } : {}),
    },
    include: { payments: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: invoices })
})

invoicesRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = InvoiceSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      ...data,
      dueCents: data.dueCents ?? data.totalCents,
      ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
    },
  })
  res.status(201).json({ data: invoice })
})

invoicesRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, tenantId },
    include: { payments: true },
  })
  if (!invoice) { res.status(404).json({ error: 'Invoice not found' }); return }
  res.json({ data: invoice })
})

// POST /api/invoices/:id/send  — marks SENT, emails PDF, SMS link
invoicesRouter.post('/:id/send', requireActivePlan, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest

  const [existing, tenant] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id: req.params.id, tenantId },
      include: {
        customer: {
          select: { name: true, email: true, phone: true, sms_opt_out: true, email_opt_out: true },
        },
      },
    }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])

  if (!existing) { res.status(404).json({ error: 'Invoice not found' }); return }
  if (existing.status === 'VOID') {
    res.status(400).json({ error: 'Cannot send a voided invoice' }); return
  }

  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: { status: 'SENT', sentAt: new Date() },
  })

  res.json({ data: invoice })

  const FRONTEND_URL = process.env.FRONTEND_URL ?? 'http://localhost:8081'
  const viewUrl = `${FRONTEND_URL}/invoices/${existing.id}`
  const clientName = existing.customer?.name ?? 'Customer'
  const businessName = tenant?.name ?? 'Verde Ops'
  const totalFormatted = `$${(existing.totalCents / 100).toFixed(2)}`
  const dueDateFormatted = existing.dueDate
    ? existing.dueDate.toLocaleDateString('en-US')
    : 'Upon receipt'

  try {
    if (existing.customer?.email && !existing.customer.email_opt_out) {
      const pdfBuffer = await generatePdf({
        type: 'invoice',
        number: existing.number,
        businessName,
        clientName,
        clientEmail: existing.customer.email,
        date: new Date(),
        dueDate: existing.dueDate ?? undefined,
        lines: [],
        totalCents: existing.totalCents,
        notes: existing.notes ?? undefined,
      })
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const FROM = process.env.EMAIL_FROM ?? 'Verde Ops <noreply@example.com>'
      const { subject, html } = invoiceSentEmail(
        'en', clientName, businessName, existing.number, totalFormatted, dueDateFormatted, viewUrl,
      )
      await resend.emails.send({
        from: FROM,
        to: existing.customer.email,
        subject,
        html,
        attachments: [{ filename: `invoice-${existing.number}.pdf`, content: pdfBuffer }],
      })
    }

    if (existing.customer?.phone && !existing.customer.sms_opt_out) {
      const smsBody = invoiceSentSms('en', clientName, existing.number, existing.totalCents, viewUrl)
      await sendSms(existing.customer.phone, smsBody)
    }
  } catch (err) {
    console.error('[Invoice/send] Delivery error:', err)
  }
})

invoicesRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Invoice not found' }); return }
  const UpdateSchema = z.object({
    status: z.enum(['DRAFT','SENT','PARTIAL','PAID','OVERDUE','VOID']).optional(),
    paidCents: z.number().int().nonnegative().optional(),
    dueDate: z.string().datetime().optional(),
    notes: z.string().max(2000).optional(),
    sentAt: z.string().datetime().optional(),
    paidAt: z.string().datetime().optional(),
  })
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const invoice = await prisma.invoice.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.dueDate ? { dueDate: new Date(data.dueDate) } : {}),
      ...(data.sentAt ? { sentAt: new Date(data.sentAt) } : {}),
      ...(data.paidAt ? { paidAt: new Date(data.paidAt) } : {}),
    },
  })
  res.json({ data: invoice })
})
