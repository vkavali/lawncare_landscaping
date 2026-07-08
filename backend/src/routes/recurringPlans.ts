import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, requireOwner, type TenantRequest } from '../middleware/requireTenant.js'

export const recurringPlansRouter = Router()
recurringPlansRouter.use(requireAuth, requireTenant)

const PlanSchema = z.object({
  customerId: z.string().cuid().optional(),
  crewId: z.string().cuid().optional(),
  service: z.string().min(1).max(200),
  frequency: z.enum(['WEEKLY','BIWEEKLY','MONTHLY','CUSTOM']),
  dayOfWeek: z.number().int().min(0).max(6).optional(),
  timeOfDay: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  priceCents: z.number().int().nonnegative().optional(),
  active: z.boolean().optional(),
  autopilot: z.boolean().optional(),
  nextRunAt: z.string().datetime().optional(),
})

recurringPlansRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { active } = req.query as { active?: string }
  const plans = await prisma.recurringPlan.findMany({
    where: {
      tenantId,
      ...(active === 'true' ? { active: true } : active === 'false' ? { active: false } : {}),
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: plans })
})

recurringPlansRouter.post('/', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = PlanSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const plan = await prisma.recurringPlan.create({
    data: {
      tenantId,
      ...data,
      ...(data.nextRunAt ? { nextRunAt: new Date(data.nextRunAt) } : {}),
    },
  })
  res.status(201).json({ data: plan })
})

recurringPlansRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const plan = await prisma.recurringPlan.findFirst({ where: { id: req.params.id, tenantId } })
  if (!plan) { res.status(404).json({ error: 'Plan not found' }); return }
  res.json({ data: plan })
})

recurringPlansRouter.patch('/:id', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.recurringPlan.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Plan not found' }); return }
  const parsed = PlanSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const plan = await prisma.recurringPlan.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.nextRunAt ? { nextRunAt: new Date(data.nextRunAt) } : {}) },
  })
  res.json({ data: plan })
})

recurringPlansRouter.delete('/:id', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.recurringPlan.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Plan not found' }); return }
  await prisma.recurringPlan.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})
