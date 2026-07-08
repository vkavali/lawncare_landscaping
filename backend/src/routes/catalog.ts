import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import type { Request, Response } from 'express'

export const catalogRouter = Router()
catalogRouter.use(requireAuth, requireTenant)

const ItemSchema = z.object({
  name: z.string().min(1).max(200),
  nameEs: z.string().max(200).optional(),
  description: z.string().max(1000).optional(),
  unitPriceCents: z.number().int().min(0).default(0),
  durationMin: z.number().int().min(0).optional(),
  active: z.boolean().default(true),
})

catalogRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const items = await prisma.serviceCatalogItem.findMany({
    where: { tenantId, active: true },
    orderBy: { name: 'asc' },
  })
  res.json({ items })
})

catalogRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = ItemSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const item = await prisma.serviceCatalogItem.create({ data: { ...parsed.data, tenantId } })
  res.status(201).json({ item })
})

catalogRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = ItemSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const existing = await prisma.serviceCatalogItem.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  const item = await prisma.serviceCatalogItem.update({ where: { id: req.params.id }, data: parsed.data })
  res.json({ item })
})

catalogRouter.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.serviceCatalogItem.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.serviceCatalogItem.update({ where: { id: req.params.id }, data: { active: false } })
  res.status(204).end()
})
