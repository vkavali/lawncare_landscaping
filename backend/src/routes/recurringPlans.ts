import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import type { Request, Response } from 'express'

export const recurringPlansRouter = Router()
recurringPlansRouter.use(requireAuth, requireTenant)

const PlanSchema = z.object({
  customerId: z.string().optional(),
  crewId: z.string().optional(),
  service: z.string().min(1).max(200),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  timeOfDay: z.string().max(5).optional(),
  priceCents: z.number().int().min(0).default(0),
  active: z.boolean().default(true),
  autopilot: z.boolean().default(true),
})

recurringPlansRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const plans = await prisma.recurringPlan.findMany({
    where: { tenantId, active: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ plans })
})

recurringPlansRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = PlanSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const plan = await prisma.recurringPlan.create({ data: { ...parsed.data, tenantId } })
  res.status(201).json({ plan })
})

recurringPlansRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = PlanSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const existing = await prisma.recurringPlan.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  const plan = await prisma.recurringPlan.update({ where: { id: req.params.id }, data: parsed.data })
  res.json({ plan })
})

recurringPlansRouter.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.recurringPlan.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.recurringPlan.update({ where: { id: req.params.id }, data: { active: false } })
  res.status(204).end()
})
