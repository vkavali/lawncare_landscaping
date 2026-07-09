import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not set — billing features will throw at runtime')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder')

export const PRICE_IDS = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? '',
  team: process.env.STRIPE_TEAM_PRICE_ID ?? '',
} as const

export const PLATFORM_FEE_PERCENT = Number(process.env.PLATFORM_FEE_PERCENT ?? 2)
