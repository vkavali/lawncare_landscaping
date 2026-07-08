import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import type { Request, Response } from 'express'

export const invoicesRouter = Router()
invoicesRouter.use(requireAuth, requireTenant)

const PaymentSchema = z.object({
  amountCents: z.number().int().min(1),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHECK', 'VENMO', 'ZELLE', 'OTHER']),
  reference: z.string().max(100).optional(),
  note: z.string().max(500).optional(),
})

async function nextInvoiceNumber(tenantId: string) {
  const last = await prisma.invoice.findFirst({
    where: { tenantId },
    orderBy: { createdAt: 'desc' },
    select: { number: true },
  })
  const n = last ? parseInt(last.number.replace(/\D/g, '')) + 1 : 1001
  return String(n)
}

invoicesRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { status } = req.query as Record<string, string | undefined>
  const invoices = await prisma.invoice.findMany({
    where: { tenantId, ...(status ? { status: status as 'DRAFT' } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { customer: true, payments: true },
  })
  res.json({ invoices })
})

invoicesRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params.id, tenantId },
    include: { customer: true, payments: true, job: true },
  })
  if (!invoice) { res.status(404).json({ error: 'Not found' }); return }
  res.json({ invoice })
})

invoicesRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { customerId, jobId, estimateId, totalCents, dueDate, notes } = req.body as Record<string, unknown>
  const number = await nextInvoiceNumber(tenantId)
  const invoice = await prisma.invoice.create({
    data: {
      tenantId,
      number,
      customerId: customerId as string | undefined,
      jobId: jobId as string | undefined,
      estimateId: estimateId as string | undefined,
      totalCents: Number(totalCents ?? 0),
      dueCents: Number(totalCents ?? 0),
      dueDate: dueDate ? new Date(dueDate as string) : undefined,
      notes: notes as string | undefined,
    },
  })
  res.status(201).json({ invoice })
})

invoicesRouter.post('/:id/payments', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = PaymentSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const invoice = await prisma.invoice.findFirst({ where: { id: req.params.id, tenantId } })
  if (!invoice) { res.status(404).json({ error: 'Not found' }); return }
  const newPaid = invoice.paidCents + parsed.data.amountCents
  const status =
    newPaid >= invoice.totalCents ? 'PAID' : newPaid > 0 ? 'PARTIAL' : invoice.status
  const [payment] = await prisma.$transaction([
    prisma.payment.create({ data: { ...parsed.data, tenantId, invoiceId: invoice.id } }),
    prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        paidCents: newPaid,
        dueCents: Math.max(0, invoice.totalCents - newPaid),
        status,
        ...(status === 'PAID' ? { paidAt: new Date() } : {}),
      },
    }),
  ])
  res.status(201).json({ payment })
})
