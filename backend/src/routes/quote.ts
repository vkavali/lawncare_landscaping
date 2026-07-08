import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'

export const quoteRouter = Router()
quoteRouter.use(requireAuth, requireTenant)

const LineInput = z.object({
  serviceId: z.string().cuid().optional(),
  description: z.string().min(1).max(500),
  descriptionEs: z.string().max(500).optional(),
  qty: z.number().int().positive().default(1),
  unitCentsOverride: z.number().int().nonnegative().optional(),
})

const PreviewSchema = z.object({
  lines: z.array(LineInput).min(1),
  depositPct: z.number().min(0).max(100).optional(),
  customerName: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
})

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
const fmt = (cents: number) => usd.format(cents / 100)

// POST /api/quote/preview
quoteRouter.post('/preview', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = PreviewSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const { lines, depositPct = 20, customerName, notes } = parsed.data

  // Resolve service catalog prices for any line that provides a serviceId
  const serviceIds = lines.filter((l) => l.serviceId).map((l) => l.serviceId as string)
  const services = serviceIds.length
    ? await prisma.serviceCatalogItem.findMany({ where: { id: { in: serviceIds }, tenantId, active: true } })
    : []
  const serviceMap = new Map(services.map((s) => [s.id, s]))

  const resolvedLines = lines.map((l) => {
    const svc = l.serviceId ? serviceMap.get(l.serviceId) : undefined
    if (l.serviceId && !svc) return null
    const unitCents = l.unitCentsOverride ?? svc?.unitPriceCents ?? 0
    return {
      serviceId: l.serviceId,
      description: l.description || svc?.name || '',
      descriptionEs: l.descriptionEs || svc?.nameEs || undefined,
      qty: l.qty,
      unitCents,
      totalCents: l.qty * unitCents,
    }
  })

  if (resolvedLines.some((l) => l === null)) {
    res.status(400).json({ error: 'One or more serviceIds not found in tenant catalog' }); return
  }

  const validLines = resolvedLines as NonNullable<(typeof resolvedLines)[number]>[]
  const subtotalCents = validLines.reduce((sum, l) => sum + l.totalCents, 0)
  const depositCents = Math.round(subtotalCents * (depositPct / 100))

  res.json({
    lines: validLines,
    subtotalCents,
    depositCents,
    depositPct,
    formatted: {
      subtotal: fmt(subtotalCents),
      deposit: fmt(depositCents),
    },
    customerName,
    notes,
  })
})
