import { type Request, type Response, type NextFunction } from 'express'
import { prisma } from '../db.js'
import type { AuthedRequest } from './requireAuth.js'

export interface TenantRequest extends AuthedRequest {
  tenantId: string
  tenantRole: 'OWNER' | 'CREW'
}

export async function requireTenant(req: Request, res: Response, next: NextFunction) {
  const userId = (req as AuthedRequest).userId
  if (!userId) {
    res.status(401).json({ error: 'requireAuth must run before requireTenant' })
    return
  }

  // Tenant can come from header X-Tenant-Id or query param tenantId
  const tenantId =
    (req.headers['x-tenant-id'] as string | undefined) ?? (req.query.tenantId as string | undefined)

  if (!tenantId) {
    res.status(400).json({ error: 'X-Tenant-Id header or tenantId query param required' })
    return
  }

  const membership = await prisma.tenantUser.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true },
  })

  if (!membership) {
    res.status(403).json({ error: 'Not a member of this tenant' })
    return
  }

  ;(req as TenantRequest).tenantId = tenantId
  ;(req as TenantRequest).tenantRole = membership.role as 'OWNER' | 'CREW'
  next()
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  if ((req as TenantRequest).tenantRole !== 'OWNER') {
    res.status(403).json({ error: 'Owner role required' })
    return
  }
  next()
}
