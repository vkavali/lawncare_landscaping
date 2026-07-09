# Latest Changes and Status

Last updated: 2026-07-09

## Overview

`lawncare_landscaping` was a single-tenant Expo demo app for "Gutierrez Verde Ops" (a Mexican lawn-care business). It has been pivoted into a **multi-tenant US-focused SaaS** for lawn-care providers.

- **Market:** US-only. Any US lawn-care provider can sign up.
- **Currency:** USD (stored as integer cents everywhere).
- **Languages:** en-US + es-US (US Latino Spanish for the industry).
- **Payments:** Stripe (SaaS billing via subscriptions) + Stripe Connect (owner-received customer payments).
- **Comms:** Twilio SMS + Resend email + WhatsApp deep-link.
- **Storage:** Cloudflare R2 for photos + PDFs (10GB free tier, no egress fees).
- **Auth:** Email/password + Google OAuth. Owner + Crew user model.

## Phase 1 — Multi-tenant foundation (6 commits)

| Hash | Chunk |
|------|-------|
| `005185b` | refactor: decompose App.tsx into per-screen modules |
| `3726a91` | feat(db): multi-tenant Postgres schema via Prisma |
| `0ef188f` | feat(auth): email/password + Google OAuth + JWT + tenant middleware |
| `e2fcc50` | feat(api): tenant-scoped REST endpoints backed by Prisma |
| `d1885f8` | feat(mobile): wire screens to backend API with react-query + auth |
| `e7bd058` | feat(i18n): i18next + US Latino Spanish glossary + industry-accurate translations |

### Phase 1 deliverables

- **App.tsx decomposed** from 3,178 lines into per-screen modules (`src/screens/*`), shared components, theme.
- **Prisma schema** with `tenants`, `users`, `tenant_users`, `customers`, `properties`, `service_catalog`, `jobs`, `job_status_events`, `job_photos`, `crews`, `crew_members`, `estimates`, `invoices`, `payments`, `leads`, `recurring_plans`. Every table FK'd to `tenant_id`.
- **Auth service**: signup, login, refresh, forgot/reset password, `/me`, Google OAuth callback. `requireAuth`, `requireTenant`, `requireOwner` middleware.
- **12 tenant-scoped REST routes** with Zod input validation. Photo upload as multipart to Railway volume disk.
- **Mobile app** now calls the backend via `@tanstack/react-query`. Login + signup screens (bilingual). Onboarding wizard (business name → US address → language → services → base pricing). Offline mutation queue in AsyncStorage.
- **i18n via i18next** with full en/es catalogs. ~150-term US Latino Spanish lawn-care glossary. Voice recognition: `es-US` primary, `es-MX` fallback for Spanish, `en-US` for English.

## Phase 2 — Billing, comms, storage (5 commits)

| Hash | Chunk |
|------|-------|
| `97a2c5c` | feat(payments): Stripe subscription checkout + billing portal + webhook |
| `9f7d79a` | feat(payments): Stripe Connect for owner-collected customer payments |
| `8132bb5` | feat(comms): Twilio SMS + Resend email + real forgot/reset password |
| `7fd8d64` | feat(storage): Cloudflare R2 for job photos + estimate/invoice PDFs |
| `e028527` | feat(mobile): billing UI + payment collection + Stripe React Native |

### Phase 2 deliverables

- **Stripe SaaS billing** — Pro ($49/mo) and Team ($99/mo) subscription tiers. Checkout, Billing Portal, webhook syncs `Tenant.plan_status`.
- **`requireActivePlan` middleware** — 402 on write endpoints if tenant plan expired or not active/trialing.
- **Stripe Connect Express** — owners onboard via hosted flow. `POST /api/payments/intent` creates PaymentIntent on the owner's Connect account with 2% platform fee routed to the platform Stripe account.
- **Twilio SMS** — job-status transitions (en-route, on-site, completed) auto-send SMS to customer (respects `Customer.sms_opt_out`).
- **Resend email** — welcome, forgot-password, reset-password confirmation, estimate sent, invoice sent, payment received. Bilingual templates.
- **PDF generation** — PDFKit-based estimates and invoices with branded header + line-item table.
- **Cloudflare R2** — presigned direct-upload from mobile. 7-day presigned download URLs. Fallback to Railway disk if not configured.
- **Real forgot/reset password** — SHA-256 token, 1h expiry, email link via Resend.
- **Mobile Billing screen** — plan status, upgrade to Pro/Team (opens Stripe Checkout via `Linking.openURL`), Manage Subscription (opens Billing Portal), Set Up Card Payments (opens Connect onboarding).
- **Charge Card button** on invoices — calls `/api/payments/intent`. Requires Connect onboarded.

## What's still stubbed / punted to later

- `@stripe/stripe-react-native` PaymentSheet — installed but not wired. Requires EAS Build with expo-dev-client for in-app card entry. Current "Charge Card" flow uses Stripe hosted pages via deep link.
- No push notifications (Expo Push) yet.
- No customer web portal for approving estimates / paying invoices without SMS/email link.
- No reporting dashboard (revenue by month, aging, etc.).
- No scheduling / crew dispatch beyond manual assign.

## Environment variables — status

### Defaults / generated (set via `railway variables set` after `railway login`)

```
JWT_SECRET          # generate: openssl rand -hex 32
PLATFORM_FEE_PERCENT=2
EMAIL_FROM=noreply@example.com   # replace once Resend domain verified
NODE_ENV=production
UPLOAD_DIR=/app/uploads
PORT=4000
```

### Must come from user's account signup — cannot be generated

| Variable | Source |
|----------|--------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → signing secret |
| `STRIPE_PRO_PRICE_ID` | Stripe Dashboard → Products → Verde Ops Pro price |
| `STRIPE_TEAM_PRICE_ID` | Stripe Dashboard → Products → Verde Ops Team price |
| `STRIPE_CONNECT_CLIENT_ID` | Stripe Dashboard → Settings → Connect → client ID |
| `TWILIO_ACCOUNT_SID` | Twilio Console → Account info |
| `TWILIO_AUTH_TOKEN` | Twilio Console → Account info |
| `TWILIO_FROM_NUMBER` | Twilio Console → Phone Numbers |
| `RESEND_API_KEY` | Resend Dashboard → API Keys |
| `R2_ACCOUNT_ID` | Cloudflare Dashboard → R2 → Overview |
| `R2_ACCESS_KEY_ID` | Cloudflare Dashboard → R2 → Manage API tokens |
| `R2_SECRET_ACCESS_KEY` | Cloudflare Dashboard → R2 → Manage API tokens |
| `R2_BUCKET` | `verde-ops` (the bucket name you create) |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → OAuth 2.0 credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → OAuth 2.0 credentials |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys (publishable) |

## Dashboard click sequences

### Stripe (stripe.com/dashboard)

1. Create Product "Verde Ops Pro" → recurring $49/month → copy Price ID → `STRIPE_PRO_PRICE_ID`
2. Create Product "Verde Ops Team" → recurring $99/month → copy Price ID → `STRIPE_TEAM_PRICE_ID`
3. Settings → Billing → Customer portal → enable and save
4. Settings → Connect → enable Express accounts → copy Connect client ID → `STRIPE_CONNECT_CLIENT_ID`
5. Developers → Webhooks → Add endpoint `https://<railway-url>/webhooks/stripe`
   Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`, `account.updated`, `payment_intent.succeeded`
   Copy signing secret → `STRIPE_WEBHOOK_SECRET`

### Twilio (console.twilio.com)

1. Create account → buy US phone number
2. Copy Account SID, Auth Token, phone number → the three `TWILIO_*` vars

### Resend (resend.com)

1. Create account → Domains → add + verify sending domain
2. API Keys → create key → `RESEND_API_KEY`
3. Set `EMAIL_FROM` to `noreply@<yourdomain>` (must match verified domain)

### Cloudflare R2 (dash.cloudflare.com → R2)

1. Create bucket `verde-ops`
2. Manage R2 API tokens → create token with Object Read & Write on that bucket
3. Copy Account ID, Access Key ID, Secret Access Key → the four `R2_*` vars

### Railway

- Add Postgres add-on (auto-populates `DATABASE_URL`)
- Set env vars: `railway variables set "<KEY>=<value>"`
- Apply schema: `railway run npx prisma db push` (dev) or `railway run npx prisma migrate deploy` (prod migrations)

## Next candidates (Phase 3)

- **PaymentSheet in-app** — wire `@stripe/stripe-react-native` after EAS Build configured. Enables card-on-file inside the mobile app.
- **Push notifications** — Expo Push for crew alerts (new job, status updates).
- **Customer web portal** — public web page where customers approve estimates and pay invoices.
- **Reporting dashboard** — revenue by month, job completion rate, collections aging.
- **Scheduling / crew dispatch** — assign jobs to crew members, GPS check-in via phone.
- **Rotate placeholder `EMAIL_FROM`** to real verified domain once Resend is configured.

## Repo structure map

```
lawncare_landscaping/
├── App.tsx                          # thin shell: tab router + screen renders
├── src/
│   ├── screens/                     # Today, Agenda, Jobs, Quote, Crm, Collections,
│   │                                #   Demo, Login, Signup, Onboarding, Billing
│   ├── components/                  # SectionCard, TonePill, StatCard, etc.
│   ├── state/                       # per-screen hooks + useAppState
│   ├── styles/                      # theme.ts + shared.ts + per-screen StyleSheet
│   ├── api/                         # client.ts (fetch wrapper) + react-query hooks
│   ├── i18n/                        # en.json, es.json, i18next config
│   └── data.ts                      # tabs config + static seed data
├── backend/
│   ├── prisma/
│   │   └── schema.prisma            # full multi-tenant schema
│   ├── src/
│   │   ├── server.ts                # Express app entry point
│   │   ├── routes/                  # auth, billing, jobs, estimates, invoices,
│   │   │                            #   payments, customers, properties,
│   │   │                            #   service-catalog, quote, crews, leads,
│   │   │                            #   recurring-plans, webhooks
│   │   ├── middleware/              # requireAuth, requireTenant, requireOwner,
│   │   │                            #   requireActivePlan
│   │   ├── services/                # stripe.ts, twilio.ts, email.ts (Resend),
│   │   │                            #   pdf.ts (PDFKit), storage.ts (R2)
│   │   ├── templates/               # email.ts + sms.ts (bilingual)
│   │   └── demo-data.ts             # legacy seed (kept for demo tenant)
│   └── package.json
├── assets/
├── app.json                         # Expo config + @stripe/stripe-react-native plugin
├── package.json                     # Expo/RN deps + @stripe/stripe-react-native
└── LATEST_CHANGES_AND_STATUS.md    # this file
```

## For a future Claude session

```bash
git clone https://github.com/vkavali/lawncare_landscaping.git
cd lawncare_landscaping
cat LATEST_CHANGES_AND_STATUS.md   # read this first
git log --oneline -20               # see both phases
```

Don't repeat committed work. Pick up from Phase 3 candidates above.
