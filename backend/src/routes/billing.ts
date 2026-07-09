import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { stripe, PRICE_IDS } from '../services/stripe.js'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/requireAuth.js'
import { requireTenant, requireOwner, type TenantRequest } from '../middleware/requireTenant.js'
import type { AuthedRequest } from '../middleware/requireAuth.js'

export const billingRouter = Router()
billingRouter.use(requireAuth, requireTenant, requireOwner)

const FRONTEND_URL = process.env.FRONTEND_URL ?? 'exp://localhost:8081'

async function getOrCreateStripeCustomer(
  tenantId: string,
  userEmail: string,
  tenantName: string,
): Promise<string> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripe_customer_id: true },
  })
  if (tenant?.stripe_customer_id) return tenant.stripe_customer_id

  const customer = await stripe.customers.create({
    email: userEmail,
    name: tenantName,
    metadata: { tenantId },
  })

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { stripe_customer_id: customer.id },
  })

  return customer.id
}

// POST /api/billing/checkout  — returns Stripe Checkout Session URL
billingRouter.post('/checkout', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as TenantRequest & AuthedRequest
  const schema = z.object({ tier: z.enum(['pro', 'team']) })
  const parsed = schema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors })
    return
  }

  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])
  if (!user || !tenant) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const priceId = PRICE_IDS[parsed.data.tier]
  if (!priceId) {
    res.status(500).json({ error: `STRIPE_${parsed.data.tier.toUpperCase()}_PRICE_ID not configured` })
    return
  }

  const customerId = await getOrCreateStripeCustomer(tenantId, user.email, tenant.name)

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${FRONTEND_URL}/billing?success=1`,
    cancel_url: `${FRONTEND_URL}/billing?canceled=1`,
    metadata: { tenantId },
    subscription_data: { metadata: { tenantId } },
  })

  res.json({ url: session.url })
})

// POST /api/billing/portal  — returns Stripe Billing Portal URL
billingRouter.post('/portal', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripe_customer_id: true },
  })

  if (!tenant?.stripe_customer_id) {
    res.status(400).json({ error: 'No billing account found. Subscribe first.' })
    return
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripe_customer_id,
    return_url: `${FRONTEND_URL}/billing`,
  })

  res.json({ url: session.url })
})

// GET /api/billing/subscription  — current plan info
billingRouter.get('/subscription', async (req: Request, res: Response) => {
  const { tenantId } = req as TenantRequest
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      tier: true,
      plan_status: true,
      trial_ends_at: true,
      stripe_subscription_id: true,
    },
  })

  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' })
    return
  }

  let next_billing_date: string | null = null
  if (tenant.stripe_subscription_id) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id) as any
      next_billing_date = new Date((sub.current_period_end as number) * 1000).toISOString()
    } catch {
      // ignore transient Stripe errors
    }
  }

  res.json({
    tier: tenant.tier,
    plan_status: tenant.plan_status,
    trial_ends_at: tenant.trial_ends_at,
    next_billing_date,
    has_subscription: !!tenant.stripe_subscription_id,
  })
})

// POST /api/billing/connect/onboard  — returns Stripe Connect Express onboarding link
billingRouter.post('/connect/onboard', async (req: Request, res: Response) => {
  const { tenantId, userId } = req as TenantRequest & AuthedRequest

  const [user, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { email: true } }),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { stripe_connect_account_id: true },
    }),
  ])

  if (!user || !tenant) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  let accountId = tenant.stripe_connect_account_id

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      email: user.email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: 'individual',
      metadata: { tenantId },
    })
    accountId = account.id
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripe_connect_account_id: accountId },
    })
  }

  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${FRONTEND_URL}/billing?connect=refresh`,
    return_url: `${FRONTEND_URL}/billing?connect=success`,
    type: 'account_onboarding',
  })

  res.json({ url: accountLink.url })
})
