import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import type { Request, Response } from 'express'

export const leadsRouter = Router()
leadsRouter.use(requireAuth, requireTenant)

const LeadSchema = z.object({
  customerId: z.string().optional(),
  source: z.string().max(100).optional(),
  service: z.string().max(200).optional(),
  stage: z.enum(['NEW', 'SITE_VISIT', 'PROPOSAL', 'DEPOSIT', 'WON', 'LOST']).default('NEW'),
  valueCents: z.number().int().min(0).default(0),
  nextStep: z.string().max(500).optional(),
  nextStepAt: z.string().datetime().optional(),
  notes: z.string().max(2000).optional(),
  lostReason: z.string().max(500).optional(),
})

leadsRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { stage } = req.query as Record<string, string | undefined>
  const leads = await prisma.lead.findMany({
    where: { tenantId, ...(stage ? { stage: stage as 'NEW' } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { customer: true },
  })
  res.json({ leads })
})

leadsRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const lead = await prisma.lead.findFirst({
    where: { id: req.params.id, tenantId },
    include: { customer: true },
  })
  if (!lead) { res.status(404).json({ error: 'Not found' }); return }
  res.json({ lead })
})

leadsRouter.post('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = LeadSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const { nextStepAt, ...rest } = parsed.data
  const lead = await prisma.lead.create({
    data: { ...rest, tenantId, ...(nextStepAt ? { nextStepAt: new Date(nextStepAt) } : {}) },
  })
  res.status(201).json({ lead })
})

leadsRouter.patch('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = LeadSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  const { nextStepAt, ...rest } = parsed.data
  const lead = await prisma.lead.update({
    where: { id: req.params.id },
    data: { ...rest, ...(nextStepAt ? { nextStepAt: new Date(nextStepAt) } : {}) },
  })
  res.json({ lead })
})

leadsRouter.delete('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.lead.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Not found' }); return }
  await prisma.lead.delete({ where: { id: req.params.id } })
  res.status(204).end()
})
