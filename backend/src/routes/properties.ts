import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import { US_STATES } from '../utils/constants.js'

export const propertiesRouter = Router()
propertiesRouter.use(requireAuth, requireTenant)

const PropertySchema = z.object({
  customerId: z.string().cuid(),
  name: z.string().max(200).optional(),
  address: z.string().min(1).max(300),
  city: z.string().min(1).max(100),
  state: z.enum(US_STATES).default('TX'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/).optional().or(z.literal('')),
  lotSizeSqft: z.number().int().positive().optional(),
  gateCode: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
})

propertiesRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { customerId } = req.query as { customerId?: string }
  const properties = await prisma.property.findMany({
    where: { tenantId, ...(customerId ? { customerId } : {}) },
    orderBy: { address: 'asc' },
  })
  res.json({ data: properties })
})

propertiesRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = PropertySchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const customer = await prisma.customer.findFirst({ where: { id: parsed.data.customerId, tenantId } })
  if (!customer) { res.status(400).json({ error: 'Customer not found in tenant' }); return }
  const property = await prisma.property.create({ data: { tenantId, ...parsed.data } })
  res.status(201).json({ data: property })
})

propertiesRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const property = await prisma.property.findFirst({ where: { id: req.params.id, tenantId } })
  if (!property) { res.status(404).json({ error: 'Property not found' }); return }
  res.json({ data: property })
})

propertiesRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.property.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Property not found' }); return }
  const parsed = PropertySchema.omit({ customerId: true }).partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const property = await prisma.property.update({ where: { id: req.params.id }, data: parsed.data })
  res.json({ data: property })
})

propertiesRouter.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.property.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Property not found' }); return }
  await prisma.property.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})
