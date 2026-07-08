import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'

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
