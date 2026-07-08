import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import { US_STATES } from '../utils/constants.js'

export const customersRouter = Router()
customersRouter.use(requireAuth, requireTenant)

const CustomerSchema = z.object({
  name: z.string().min(1).max(200),
  phone: z.string().max(30).optional(),
  email: z.string().email().optional().or(z.literal('')),
  address: z.string().max(300).optional(),
  city: z.string().max(100).optional(),
  state: z.enum(US_STATES).default('TX'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional().or(z.literal('')),
  notes: z.string().max(2000).optional(),
  needsInvoice: z.boolean().optional(),
})

customersRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const q = req.query
  const customers = await prisma.customer.findMany({
    where: { tenantId, ...(q.needsInvoice === 'true' ? { needsInvoice: true } : {}) },
    orderBy: { name: 'asc' },
  })
  res.json({ data: customers })
})

customersRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = CustomerSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const customer = await prisma.customer.create({ data: { tenantId, ...parsed.data } })
  res.status(201).json({ data: customer })
})

customersRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const customer = await prisma.customer.findFirst({
    where: { id: req.params.id, tenantId },
    include: { properties: true },
  })
  if (!customer) { res.status(404).json({ error: 'Customer not found' }); return }
  res.json({ data: customer })
})

customersRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Customer not found' }); return }
  const parsed = CustomerSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const customer = await prisma.customer.update({ where: { id: req.params.id }, data: parsed.data })
  res.json({ data: customer })
})

customersRouter.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.customer.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Customer not found' }); return }
  await prisma.customer.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})
