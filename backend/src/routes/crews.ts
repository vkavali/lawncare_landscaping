import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, requireOwner, type TenantRequest } from '../middleware/requireTenant.js'

export const crewsRouter = Router()
crewsRouter.use(requireAuth, requireTenant)

const CrewSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(20).optional(),
  active: z.boolean().optional(),
})

const MemberSchema = z.object({
  userId: z.string().cuid().optional(),
  name: z.string().min(1).max(100),
  role: z.string().max(50).optional(),
})

crewsRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const crews = await prisma.crew.findMany({
    where: { tenantId },
    include: { members: true },
    orderBy: { name: 'asc' },
  })
  res.json({ data: crews })
})

crewsRouter.post('/', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = CrewSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const crew = await prisma.crew.create({ data: { tenantId, ...parsed.data } })
  res.status(201).json({ data: crew })
})

crewsRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const crew = await prisma.crew.findFirst({
    where: { id: req.params.id, tenantId },
    include: { members: true },
  })
  if (!crew) { res.status(404).json({ error: 'Crew not found' }); return }
  res.json({ data: crew })
})

crewsRouter.patch('/:id', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.crew.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Crew not found' }); return }
  const parsed = CrewSchema.partial().safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const crew = await prisma.crew.update({ where: { id: req.params.id }, data: parsed.data })
  res.json({ data: crew })
})

crewsRouter.delete('/:id', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.crew.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Crew not found' }); return }
  await prisma.crew.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

crewsRouter.post('/:id/members', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const crew = await prisma.crew.findFirst({ where: { id: req.params.id, tenantId } })
  if (!crew) { res.status(404).json({ error: 'Crew not found' }); return }
  const parsed = MemberSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const member = await prisma.crewMember.create({ data: { crewId: req.params.id, ...parsed.data } })
  res.status(201).json({ data: member })
})

crewsRouter.delete('/:id/members/:memberId', requireOwner, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const crew = await prisma.crew.findFirst({ where: { id: req.params.id, tenantId } })
  if (!crew) { res.status(404).json({ error: 'Crew not found' }); return }
  const member = await prisma.crewMember.findFirst({ where: { id: req.params.memberId, crewId: req.params.id } })
  if (!member) { res.status(404).json({ error: 'Member not found' }); return }
  await prisma.crewMember.delete({ where: { id: req.params.memberId } })
  res.json({ ok: true })
})
