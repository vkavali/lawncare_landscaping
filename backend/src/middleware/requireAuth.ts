import { type Request, type Response, type NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production'

export interface AuthedRequest extends Request {
  userId: string
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { sub: string }
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true } })

    if (!user) {
      res.status(401).json({ error: 'User not found' })
      return
    }

    ;(req as AuthedRequest).userId = user.id
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
