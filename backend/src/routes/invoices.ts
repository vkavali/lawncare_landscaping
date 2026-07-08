import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'

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
