import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import { stripe, PLATFORM_FEE_PERCENT } from '../services/stripe.js'

export const paymentsRouter = Router()
paymentsRouter.use(requireAuth, requireTenant)

const PaymentSchema = z.object({
  invoiceId: z.string().cuid().optional(),
  amountCents: z.number().int().positive(),
  method: z.enum(['CASH','CARD','BANK_TRANSFER','CHECK','VENMO','ZELLE','OTHER']),
  reference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
  paidAt: z.string().datetime().optional(),
})

paymentsRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { invoiceId } = req.query as { invoiceId?: string }
  const payments = await prisma.payment.findMany({
    where: { tenantId, ...(invoiceId ? { invoiceId } : {}) },
    orderBy: { paidAt: 'desc' },
  })
  res.json({ data: payments })
})

// POST /api/payments/intent  — creates Stripe PaymentIntent on owner's Connect account
paymentsRouter.post('/intent', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const schema = z.object({ invoice_id: z.string().cuid() })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const [invoice, tenant] = await Promise.all([
    prisma.invoice.findFirst({ where: { id: parsed.data.invoice_id, tenantId } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripe_connect_account_id: true, stripe_connect_onboarded_at: true },
    }),
  ])

  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' })
    return
  }
  if (!tenant?.stripe_connect_account_id || !tenant.stripe_connect_onboarded_at) {
    res.status(400).json({ error: 'Stripe Connect not onboarded. Complete setup in Billing.' })
    return
  }

  const amountCents = Math.max(invoice.totalCents - invoice.paidCents, 50) // Stripe minimum $0.50
  const platformFeeCents = Math.round(amountCents * (PLATFORM_FEE_PERCENT / 100))

  const paymentIntent = await stripe.paymentIntents.create(
    {
      amount: amountCents,
      currency: 'usd',
      application_fee_amount: platformFeeCents,
      metadata: { tenantId, invoiceId: invoice.id },
    },
    { stripeAccount: tenant.stripe_connect_account_id },
  )

  res.json({ client_secret: paymentIntent.client_secret, amount_cents: amountCents })
})

paymentsRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = PaymentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data

  // Validate invoice belongs to tenant
  if (data.invoiceId) {
    const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, tenantId } })
    if (!invoice) { res.status(400).json({ error: 'Invoice not found in tenant' }); return }
  }

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.payment.create({
      data: { tenantId, ...data, ...(data.paidAt ? { paidAt: new Date(data.paidAt) } : {}) },
    })
    if (data.invoiceId) {
      const inv = await tx.invoice.findUnique({ where: { id: data.invoiceId } })
      if (inv) {
        const newPaidCents = inv.paidCents + data.amountCents
        const newStatus = newPaidCents >= inv.totalCents ? 'PAID' : 'PARTIAL'
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { paidCents: newPaidCents, status: newStatus, ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}) },
        })
      }
    }
    return p
  })
  res.status(201).json({ data: payment })
})
