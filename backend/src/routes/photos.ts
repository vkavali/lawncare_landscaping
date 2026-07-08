import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, type TenantRequest } from '../middleware/requireTenant.js'
import type { Request, Response } from 'express'

export const photosRouter = Router()
photosRouter.use(requireAuth, requireTenant)

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'uploads')
fs.mkdirSync(UPLOAD_DIR, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Images only'))
  },
})

photosRouter.post('/jobs/:jobId', upload.array('photos', 10), async (req: Request, res: Response) => {
  const { tenantId, userId } = req as TenantRequest
  const job = await prisma.job.findFirst({ where: { id: req.params.jobId, tenantId } })
  if (!job) { res.status(404).json({ error: 'Job not found' }); return }

  const phase = ((req.body.phase as string | undefined) ?? 'BEFORE').toUpperCase()
  if (!['BEFORE', 'AFTER', 'PROGRESS'].includes(phase)) {
    res.status(400).json({ error: 'phase must be BEFORE, AFTER, or PROGRESS' })
    return
  }

  const files = req.files as Express.Multer.File[]
  if (!files?.length) { res.status(400).json({ error: 'No files uploaded' }); return }

  const baseUrl = process.env.BACKEND_URL ?? 'http://localhost:4000'
  const photos = await prisma.$transaction(
    files.map((f) =>
      prisma.jobPhoto.create({
        data: {
          jobId: req.params.jobId,
          phase: phase as 'BEFORE',
          url: `${baseUrl}/uploads/${f.filename}`,
          filename: f.filename,
          sizeBytes: f.size,
          createdBy: userId,
        },
      }),
    ),
  )
  res.status(201).json({ photos })
})

photosRouter.delete('/jobs/:jobId/:photoId', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const job = await prisma.job.findFirst({ where: { id: req.params.jobId, tenantId } })
  if (!job) { res.status(404).json({ error: 'Job not found' }); return }
  const photo = await prisma.jobPhoto.findFirst({
    where: { id: req.params.photoId, jobId: req.params.jobId },
  })
  if (!photo) { res.status(404).json({ error: 'Photo not found' }); return }
  const filePath = path.join(UPLOAD_DIR, photo.filename ?? '')
  if (photo.filename && fs.existsSync(filePath)) fs.unlinkSync(filePath)
  await prisma.jobPhoto.delete({ where: { id: photo.id } })
  res.status(204).end()
})
