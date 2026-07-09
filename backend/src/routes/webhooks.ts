import { Router, type Request, type Response } from 'express'
import type Stripe from 'stripe'
import { stripe } from '../services/stripe.js'
import { prisma } from '../db.js'

export const webhooksRouter = Router()

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? ''

// POST /webhooks/stripe
// Note: this route is mounted BEFORE express.json() in server.ts so it receives the raw body.
webhooksRouter.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature']

  if (!sig || !WEBHOOK_SECRET) {
    console.warn('[Webhook] Missing signature or STRIPE_WEBHOOK_SECRET')
    res.status(400).json({ error: 'Webhook configuration error' })
    return
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig, WEBHOOK_SECRET)
  } catch (err) {
    console.warn('[Webhook] Signature verification failed:', err)
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  try {
    // Handle connected account events (Stripe-Account header present)
    const connectedAccountId = req.headers['stripe-account'] as string | undefined

    switch (event.type) {
      // ─── SaaS Subscription Events ─────────────────────────────────────────

      case 'checkout.session.completed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const session = event.data.object as any
        if (session.mode !== 'subscription' || !session.subscription) break
        const tenantId = session.metadata?.tenantId as string | undefined
        if (!tenantId) break

        const subId = session.subscription as string
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = await stripe.subscriptions.retrieve(subId) as any
        const isTeam = sub.items?.data?.[0]?.price?.id === process.env.STRIPE_TEAM_PRICE_ID

        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            stripe_subscription_id: subId,
            plan_status: sub.status as string,
            tier: isTeam ? 'TEAM' : 'PRO',
            trial_ends_at: sub.trial_end ? new Date((sub.trial_end as number) * 1000) : null,
          },
        })
        break
      }

      case 'customer.subscription.updated': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any
        const tenantId = sub.metadata?.tenantId as string | undefined
        if (!tenantId) break
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            plan_status: sub.status as string,
            trial_ends_at: sub.trial_end ? new Date((sub.trial_end as number) * 1000) : null,
          },
        })
        break
      }

      case 'customer.subscription.deleted': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sub = event.data.object as any
        const tenantId = sub.metadata?.tenantId as string | undefined
        if (!tenantId) break
        await prisma.tenant.update({
          where: { id: tenantId },
          data: { plan_status: 'canceled', tier: 'FREE' },
        })
        break
      }

      case 'invoice.paid': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        const subId = invoice.subscription as string | null
        if (!subId) break
        const tenant = await prisma.tenant.findFirst({
          where: { stripe_subscription_id: subId },
        })
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan_status: 'active' },
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invoice = event.data.object as any
        const subId = invoice.subscription as string | null
        if (!subId) break
        const tenant = await prisma.tenant.findFirst({
          where: { stripe_subscription_id: subId },
        })
        if (tenant) {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { plan_status: 'past_due' },
          })
        }
        break
      }

      // ─── Connect Account Events ────────────────────────────────────────────

      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        if (!account.details_submitted) break
        // Mark connect onboarded when Stripe confirms details submitted
        const accountId = connectedAccountId ?? account.id
        await prisma.tenant.updateMany({
          where: { stripe_connect_account_id: accountId },
          data: { stripe_connect_onboarded_at: new Date() },
        })
        break
      }

      // ─── Connect PaymentIntent confirmation — flip invoice to PAID ─────────

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        const invoiceId = pi.metadata?.invoiceId
        const tenantId = pi.metadata?.tenantId
        if (!invoiceId || !tenantId) break

        const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, tenantId } })
        if (!inv) break

        const newPaidCents = inv.paidCents + pi.amount
        const newStatus = newPaidCents >= inv.totalCents ? 'PAID' : 'PARTIAL'

        await prisma.invoice.update({
          where: { id: invoiceId },
          data: {
            paidCents: Math.min(newPaidCents, inv.totalCents),
            status: newStatus as 'PAID' | 'PARTIAL',
            ...(newStatus === 'PAID' ? { paidAt: new Date() } : {}),
          },
        })
        break
      }
    }

    res.json({ received: true })
  } catch (err) {
    console.error('[Webhook] Handler error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
})
