import path from 'path'
import { Router, type Request, type Response } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { prisma } from '../db.js'
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js'
import { requireTenant, requireOwner, type TenantRequest } from '../middleware/requireTenant.js'
import { requireActivePlan } from '../middleware/requireActivePlan.js'
import { sendSms } from '../services/twilio.js'
import { getUploadPresignedUrl, isR2Configured } from '../services/storage.js'
import {
  jobEnRouteSms,
  jobOnSiteSms,
  jobCompletedSms,
} from '../templates/sms.js'

export const jobsRouter = Router()
jobsRouter.use(requireAuth, requireTenant)

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? '/uploads'
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:4000'

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOADS_DIR,
    filename: (_req, file, cb) => {
      const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
      cb(null, `${Date.now()}-${safe}`)
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/^image\/(jpeg|png|webp|heic)$/.test(file.mimetype)) cb(null, true)
    else cb(new Error('Only image files are allowed'))
  },
})

const JobLineSchema = z.object({
  serviceId: z.string().cuid().optional(),
  description: z.string().min(1).max(500),
  descriptionEs: z.string().max(500).optional(),
  qty: z.number().int().positive().default(1),
  unitCents: z.number().int().nonnegative(),
})

const JobSchema = z.object({
  customerId: z.string().cuid().optional(),
  propertyId: z.string().cuid().optional(),
  crewId: z.string().cuid().optional(),
  scheduledAt: z.string().datetime(),
  needsInvoice: z.boolean().optional(),
  rainSensitive: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
  lines: z.array(JobLineSchema).optional(),
})

const STATUS_ADVANCE: Record<string, string> = {
  SCHEDULED: 'EN_ROUTE',
  EN_ROUTE: 'IN_PROGRESS',
  IN_PROGRESS: 'PENDING_PAYMENT',
  PENDING_PAYMENT: 'COMPLETED',
}

jobsRouter.get('/', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const { crewId, status, customerId, from, to } = req.query as Record<string, string | undefined>
  const jobs = await prisma.job.findMany({
    where: {
      tenantId,
      ...(crewId ? { crewId } : {}),
      ...(customerId ? { customerId } : {}),
      ...(status ? { status: status as any } : {}),
      ...(from || to
        ? {
            scheduledAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: { lines: true, crew: { select: { id: true, name: true, color: true } } },
    orderBy: { scheduledAt: 'asc' },
  })
  res.json({ data: jobs })
})

jobsRouter.post('/', requireActivePlan, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const parsed = JobSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const { lines, ...jobData } = parsed.data
  const totalCents = lines ? lines.reduce((sum, l) => sum + l.qty * l.unitCents, 0) : 0
  const job = await prisma.job.create({
    data: {
      tenantId,
      ...jobData,
      scheduledAt: new Date(jobData.scheduledAt),
      totalCents,
      ...(lines?.length
        ? { lines: { create: lines.map((l) => ({ ...l, totalCents: l.qty * l.unitCents })) } }
        : {}),
    },
    include: { lines: true },
  })
  res.status(201).json({ data: job })
})

jobsRouter.get('/:id', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const job = await prisma.job.findFirst({
    where: { id: req.params.id, tenantId },
    include: { lines: true, photos: true, statusEvents: { orderBy: { createdAt: 'asc' } } },
  })
  if (!job) { res.status(404).json({ error: 'Job not found' }); return }
  res.json({ data: job })
})

jobsRouter.patch('/:id', requireActivePlan, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.job.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Job not found' }); return }
  const UpdateSchema = JobSchema.omit({ lines: true }).partial().extend({
    paymentMethod: z.enum(['CASH','CARD','BANK_TRANSFER','CHECK','VENMO','ZELLE','OTHER']).optional(),
    paidCents: z.number().int().nonnegative().optional(),
  })
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }
  const data = parsed.data
  const job = await prisma.job.update({
    where: { id: req.params.id },
    data: { ...data, ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}) },
  })
  res.json({ data: job })
})

jobsRouter.delete('/:id', requireOwner, requireActivePlan, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const existing = await prisma.job.findFirst({ where: { id: req.params.id, tenantId } })
  if (!existing) { res.status(404).json({ error: 'Job not found' }); return }
  await prisma.job.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// POST /api/jobs/:id/status  — advance through state machine or cancel
jobsRouter.post('/:id/status', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as TenantRequest & AuthedRequest
  const job = await prisma.job.findFirst({ where: { id: req.params.id, tenantId } })
  if (!job) { res.status(404).json({ error: 'Job not found' }); return }

  const { cancel, note } = req.body as { cancel?: boolean; note?: string }
  const newStatus: string = cancel ? 'CANCELLED' : (STATUS_ADVANCE[job.status] ?? job.status)
  if (newStatus === job.status) {
    res.status(400).json({ error: `Job cannot advance from ${job.status}` }); return
  }

  const now = new Date()
  const timeFields: Record<string, Date | undefined> = {}
  if (newStatus === 'IN_PROGRESS') timeFields.startedAt = now
  if (newStatus === 'COMPLETED') timeFields.completedAt = now

  const [updated] = await prisma.$transaction([
    prisma.job.update({ where: { id: req.params.id }, data: { status: newStatus as any, ...timeFields } }),
    prisma.jobStatusEvent.create({ data: { jobId: req.params.id, status: newStatus as any, note, createdBy: userId } }),
  ])
  res.json({ data: updated })

  // Fire-and-forget SMS to customer on key status transitions
  if (job.customerId && !cancel) {
    try {
      const customer = await prisma.customer.findUnique({
        where: { id: job.customerId },
        select: { phone: true, sms_opt_out: true, name: true },
      })
      if (customer?.phone && !customer.sms_opt_out) {
        let smsBody: string | null = null
        const lang = 'en' as const
        if (newStatus === 'EN_ROUTE') smsBody = jobEnRouteSms(lang, customer.name)
        else if (newStatus === 'IN_PROGRESS') smsBody = jobOnSiteSms(lang, customer.name)
        else if (newStatus === 'COMPLETED') smsBody = jobCompletedSms(lang, customer.name)
        if (smsBody) await sendSms(customer.phone, smsBody)
      }
    } catch (err) {
      console.error('[SMS] Status notification failed:', err)
    }
  }
})

// GET /api/jobs/:id/photos/upload-url — returns a presigned R2 PUT URL for direct mobile upload
jobsRouter.get('/:id/photos/upload-url', requireActivePlan, async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const job = await prisma.job.findFirst({ where: { id: req.params.id, tenantId } })
  if (!job) { res.status(404).json({ error: 'Job not found' }); return }

  if (!isR2Configured()) {
    res.status(503).json({ error: 'R2 storage not configured. Set R2_* env vars.' }); return
  }

  const { phase, filename, contentType } = req.query as {
    phase?: string; filename?: string; contentType?: string
  }
  const phaseVal = z.enum(['BEFORE', 'AFTER', 'PROGRESS']).safeParse(phase)
  if (!phaseVal.success) { res.status(400).json({ error: 'phase must be BEFORE, AFTER, or PROGRESS' }); return }

  const ext = filename ? path.extname(filename as string) : '.jpg'
  const key = `jobs/${req.params.id}/${phaseVal.data.toLowerCase()}/${Date.now()}${ext}`
  const presignedUrl = await getUploadPresignedUrl(key, (contentType as string | undefined) ?? 'image/jpeg')
  if (!presignedUrl) { res.status(500).json({ error: 'Failed to generate upload URL' }); return }

  res.json({ upload_url: presignedUrl, key })
})

// POST /api/jobs/:id/photos  — register a photo after R2 upload OR disk upload (fallback)
// If body contains { key, phase }: registers an R2-uploaded photo
// If multipart form with file: legacy disk upload (fallback when R2 not configured)
jobsRouter.post('/:id/photos', requireActivePlan, async (req: Request, res: Response, next) => {
  const { tenantId, userId } = req as TenantRequest & AuthedRequest
  const job = await prisma.job.findFirst({ where: { id: req.params.id, tenantId } })
  if (!job) { res.status(404).json({ error: 'Job not found' }); return }

  // R2 path: body has { key, phase, filename?, sizeBytes? }
  if (req.body?.key) {
    const schema = z.object({
      key: z.string().min(1),
      phase: z.enum(['BEFORE', 'AFTER', 'PROGRESS']),
      filename: z.string().optional(),
      sizeBytes: z.number().int().nonnegative().optional(),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten().fieldErrors }); return }

    const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? ''
    const R2_BUCKET = process.env.R2_BUCKET ?? ''
    const r2Url = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET}/${parsed.data.key}`

    const photo = await prisma.jobPhoto.create({
      data: {
        jobId: req.params.id,
        phase: parsed.data.phase,
        url: r2Url,
        filename: parsed.data.filename,
        sizeBytes: parsed.data.sizeBytes,
        createdBy: userId,
      },
    })
    res.status(201).json({ data: photo })
    return
  }

  // Disk fallback: parse multipart
  upload.single('photo')(req, res, async (err) => {
    if (err) { res.status(400).json({ error: err.message }); return }
    if (!req.file) { res.status(400).json({ error: 'No file uploaded and no R2 key provided' }); return }
    const phase = z.enum(['BEFORE', 'AFTER', 'PROGRESS']).safeParse(req.body.phase)
    if (!phase.success) { res.status(400).json({ error: 'phase must be BEFORE, AFTER, or PROGRESS' }); return }
    const url = `${BACKEND_URL}/uploads/${path.basename(req.file.path)}`
    const photo = await prisma.jobPhoto.create({
      data: {
        jobId: req.params.id,
        phase: phase.data,
        url,
        filename: req.file.originalname,
        sizeBytes: req.file.size,
        createdBy: userId,
      },
    })
    res.status(201).json({ data: photo })
  })
})
