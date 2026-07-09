import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { z } from 'zod'
import { prisma } from '../db.js'

export const authRouter = Router()

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'
const JWT_EXPIRY = '7d'

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ''
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ''

function signToken(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: JWT_EXPIRY })
}

// ─── Input schemas ───────────────────────────────────────────────────────────

const SignupSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  businessName: z.string().min(1).max(200),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const ForgotSchema = z.object({
  email: z.string().email(),
})

const ResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
})

// ─── POST /auth/signup ───────────────────────────────────────────────────────

authRouter.post('/signup', async (req: Request, res: Response) => {
  const parsed = SignupSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { name, email, password, businessName } = parsed.data

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already registered' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 12)

  const slug = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const uniqueSlug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      tenants: {
        create: {
          role: 'OWNER',
          tenant: {
            create: {
              name: businessName,
              slug: uniqueSlug,
              tier: 'FREE',
              locale: 'en-US',
              currency: 'USD',
              plan_status: 'trialing',
              trial_ends_at: trialEndsAt,
            },
          },
        },
      },
    },
    include: {
      tenants: { include: { tenant: true } },
    },
  })

  const token = signToken(user.id)
  const tenant = user.tenants[0]?.tenant

  res.status(201).json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, tier: tenant.tier } : null,
  })
})

// ─── POST /auth/login ────────────────────────────────────────────────────────

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const { email, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { email },
    include: { tenants: { include: { tenant: true } } },
  })

  if (!user || !user.passwordHash) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const token = signToken(user.id)
  const ownerTenant = user.tenants.find((tu) => tu.role === 'OWNER')?.tenant
  const tenant = ownerTenant ?? user.tenants[0]?.tenant

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email },
    tenant: tenant ? { id: tenant.id, name: tenant.name, slug: tenant.slug, tier: tenant.tier } : null,
  })
})

// ─── POST /auth/refresh ──────────────────────────────────────────────────────

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const { token } = req.body as { token?: string }
  if (!token) {
    res.status(401).json({ error: 'Token required' })
    return
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string }
    const newToken = signToken(payload.sub)
    res.json({ token: newToken })
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
})

// ─── POST /auth/forgot-password ─────────────────────────────────────────────

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const parsed = ForgotSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  // Stub: In production integrate SendGrid/Postmark. Return 200 regardless to prevent enumeration.
  res.json({ ok: true, message: 'If that email exists, a reset link has been sent.' })
})

// ─── POST /auth/reset-password ──────────────────────────────────────────────

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const parsed = ResetSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  // Stub: validate reset token from email link, then update passwordHash.
  res.status(501).json({ error: 'Reset not yet wired to email provider' })
})

// ─── GET /auth/me ────────────────────────────────────────────────────────────

authRouter.get('/me', async (req: Request, res: Response) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string }
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { tenants: { include: { tenant: true } } },
    })

    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    res.json({
      user: { id: user.id, name: user.name, email: user.email },
      tenants: user.tenants.map((tu) => ({
        id: tu.tenant.id,
        name: tu.tenant.name,
        slug: tu.tenant.slug,
        tier: tu.tenant.tier,
        role: tu.role,
      })),
    })
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
})

// ─── GET /auth/google ────────────────────────────────────────────────────────
// Stub: redirect to Google OAuth consent screen

authRouter.get('/google', (_req: Request, res: Response) => {
  if (!GOOGLE_CLIENT_ID) {
    res.status(501).json({ error: 'Google OAuth not configured' })
    return
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  })

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`)
})

// ─── GET /auth/google/callback ───────────────────────────────────────────────

authRouter.get('/google/callback', async (req: Request, res: Response) => {
  const code = req.query.code as string | undefined
  if (!code || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    res.status(400).json({ error: 'Missing code or OAuth config' })
    return
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    })

    const tokens = (await tokenRes.json()) as { id_token?: string; access_token?: string }
    if (!tokens.id_token) throw new Error('No id_token from Google')

    const [, payloadB64] = tokens.id_token.split('.')
    const googlePayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as {
      sub: string
      email: string
      name: string
      picture?: string
    }

    let user = await prisma.user.findUnique({ where: { googleId: googlePayload.sub } })

    if (!user) {
      user = await prisma.user.findUnique({ where: { email: googlePayload.email } })

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: googlePayload.sub, avatarUrl: googlePayload.picture },
        })
      } else {
        const slug = `${googlePayload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40)}-${Math.random().toString(36).slice(2, 6)}`
        const googleTrialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
        user = await prisma.user.create({
          data: {
            googleId: googlePayload.sub,
            email: googlePayload.email,
            name: googlePayload.name,
            avatarUrl: googlePayload.picture,
            tenants: {
              create: {
                role: 'OWNER',
                tenant: {
                  create: {
                    name: googlePayload.name,
                    slug,
                    tier: 'FREE',
                    locale: 'en-US',
                    currency: 'USD',
                    plan_status: 'trialing',
                    trial_ends_at: googleTrialEndsAt,
                  },
                },
              },
            },
          },
        })
      }
    }

    const token = signToken(user.id)
    const frontendUrl = process.env.EXPO_PUBLIC_API_URL
      ? process.env.EXPO_PUBLIC_API_URL.replace('/api', '')
      : 'http://localhost:8081'

    res.redirect(`${frontendUrl}/auth/callback?token=${token}`)
  } catch (err) {
    console.error('Google OAuth error', err)
    res.status(500).json({ error: 'OAuth failed' })
  }
})
