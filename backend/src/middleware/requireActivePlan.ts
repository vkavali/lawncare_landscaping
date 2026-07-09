import { type Request, type Response, type NextFunction } from 'express'
import { prisma } from '../db.js'
import type { TenantRequest } from './requireTenant.js'

const ALLOWED_STATUSES = ['active', 'trialing']

export async function requireActivePlan(req: Request, res: Response, next: NextFunction) {
  const { tenantId } = req as TenantRequest

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { plan_status: true, trial_ends_at: true },
  })

  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' })
    return
  }

  // Expire trial if trial_ends_at has passed
  if (
    tenant.plan_status === 'trialing' &&
    tenant.trial_ends_at &&
    tenant.trial_ends_at < new Date()
  ) {
    res.status(402).json({
      error: 'Trial expired. Please subscribe to continue.',
      code: 'TRIAL_EXPIRED',
    })
    return
  }

  if (!ALLOWED_STATUSES.includes(tenant.plan_status)) {
    res.status(402).json({
      error: 'Active subscription required.',
      code: 'SUBSCRIPTION_REQUIRED',
    })
    return
  }

  next()
}
