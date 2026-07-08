import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, requireOwner, type TenantRequest } from '../middleware/requireTenant.js'

export const serviceCatalogRouter = Router()
serviceCatalogRouter.use(requireAuth, requireTenant)

const ItemSchema = z.object({
  name: z.string().min(1).max(200),
  nameEs: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  unitPriceCents: z.number().int().nonnegative(),
  durationMin: z.number().int().positive().optional(),
  active: z.boolean().optional(),
})

serviceCatalogRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { activeOnly } = req.query as { activeOnly?: string }
  const items = await prisma.serviceCatalogItem.findMany({
    where: { tenantId, ...(activeOnly === 'true' ? { active: true } : {}) },
    orderBy: { name: 'asc' },
  })
  res.json({ data: items })
})

serviceCatalogRouter.post('/', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = ItemSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const item = await prisma.serviceCatalogItem.create({ data: { tenantId, ...parsed.data } })
  res.status(201).json({ data: item })
})

serviceCatalogRouter.patch('/:id', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.serviceCatalogItem.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Service not found' }); return }
  const parsed = ItemSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const item = await prisma.serviceCatalogItem.update({ where: { id: req.params.id }, data: parsed.data })
  res.json({ data: item })
})

serviceCatalogRouter.delete('/:id', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.serviceCatalogItem.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Service not found' }); return }
  await prisma.serviceCatalogItem.update({ where: { id: req.params.id }, data: { active: false } })
  res.json({ ok: true })
})
