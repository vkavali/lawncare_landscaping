import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'

export const leadsRouter = Router()
leadsRouter.use(requireAuth, requireTenant)

const LeadSchema = z.object({
  customerId: z.string().cuid().optional(),
  source: z.string().max(100).optional(),
  service: z.string().max(200).optional(),
  valueCents: z.number().int().nonnegative().optional(),
  nextStep: z.string().max(500).optional(),
  nextStepAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
})

const StageSchema = z.enum(['NEW','SITE_VISIT','PROPOSAL','DEPOSIT','WON','LOST'])

leadsRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { stage, customerId } = req.query as { stage?: string; customerId?: string }
  const leads = await prisma.lead.findMany({
    where: {
      tenantId,
      ...(stage ? { stage: stage as any } : {}),
      ...(customerId ? { customerId } : {}),
    },
    include: { customer: { select: { id: true, name: true, phone: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json({ data: leads })
})

leadsRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = LeadSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const lead = await prisma.lead.create({
    data: {
      tenantId,
      ...data,
      ...(data.nextStepAt ? { nextStepAt: new Date(data.nextStepAt) } : {}),
    },
  })
  res.status(201).json({ data: lead })
})

leadsRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, tenantId },
    include: { customer: true },
  })
  if (!lead) { res.status(404).json({ error: 'Lead not found' }); return }
  res.json({ data: lead })
})

leadsRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Lead not found' }); return }
  const UpdateSchema = LeadSchema.partial().extend({
    stage: StageSchema.optional(),
    wonAt: z.string().datetime().optional(),
    lostAt: z.string().datetime().optional(),
    lostReason: z.string().max(500).optional(),
  })
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const now = new Date()
  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.nextStepAt ? { nextStepAt: new Date(data.nextStepAt) } : {}),
      ...(data.wonAt ? { wonAt: new Date(data.wonAt) } : {}),
      ...(data.lostAt ? { lostAt: new Date(data.lostAt) } : {}),
      ...(data.stage === 'WON' && !existing.wonAt ? { wonAt: now } : {}),
      ...(data.stage === 'LOST' && !existing.lostAt ? { lostAt: now } : {}),
    },
  })
  res.json({ data: lead })
})

leadsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Lead not found' }); return }
  await prisma.lead.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})
