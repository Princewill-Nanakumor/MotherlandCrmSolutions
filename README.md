# Motherland CRM Solution

Multi-tenant CRM for sales teams — capture leads, assign agents, collaborate in real time, and close deals from one branded workspace.

Live site:

- [motherlandcrmsolutions.com](https://motherlandcrmsolutions.com)

Repo: [Princewill-Nanakumor/MotherlandCrmSolutions](https://github.com/Princewill-Nanakumor/MotherlandCrmSolutions)

## What this project is

A Next.js 15 App Router CRM with:

- Public marketing homepage (features, journey, pricing, FAQ)
- Auth (signup, login, email verification, password reset)
- Admin dashboard — all leads, users, import/export, billing, subscription, settings
- Agent dashboard — assigned leads only (`/dashboard/leads`)
- Realtime lead updates (Ably): status, comments, assignments
- Crypto billing (USDT TRC20/ERC20) + subscription plans / trial
- Host-based branding (display name, support email, fonts, theme)

## Tech stack

| Layer     | Choice                                               |
| --------- | ---------------------------------------------------- |
| Framework | Next.js 15 (App Router), React 19, TypeScript        |
| Styling   | Tailwind CSS 4, Radix UI, Framer Motion, Recharts    |
| Data      | MongoDB + Mongoose, TanStack Query, Zustand          |
| Auth      | NextAuth.js (`middleware.ts` + session roles)        |
| Realtime  | Ably                                                 |
| Email     | Resend                                               |
| Payments  | USDT wallet deposits (QR / address + confirm window) |
| Tests     | Vitest, Playwright                                   |
| Deploy    | Vercel (optional Speed Insights when `VERCEL=1`)     |

## Quick start

```bash
npm install
# create .env from the keys listed below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

```bash
npm run typecheck
npm run lint
npm run check
npm run build
```

## Environment variables

Do **not** commit `.env`. Typical keys (confirm exact usage in `src/libs/**`, `src/lib/**`, and `src/app/api/**`):

## Repository map

```
src/
  app/                      # App Router
    page.tsx                # Marketing homepage
    (auth)/                 # login, signup, verify, reset
    dashboard/              # CRM UI (role-gated)
    api/                    # REST handlers (leads, auth, payments, …)
    robots.ts / sitemap.ts  # Crawlability
  components/               # UI by domain (leads, billing, homepage, …)
  hooks/                    # React Query + page hooks
  lib/ / libs/              # Branding, auth helpers, payments, Ably, DB
  models/                   # Mongoose schemas
  services/                 # Server lead/query services
  context/                  # Status, dialer, search, toggles, …
middleware.ts               # Auth / role / route protection
```

## Important product routes

| URL                                                  | Purpose                             |
| ---------------------------------------------------- | ----------------------------------- |
| `/`                                                  | Marketing homepage                  |
| `/login`, `/signup`                                  | Auth                                |
| `/dashboard`                                         | Overview / analytics                |
| `/dashboard/all-leads`                               | Admin lead table + details panel    |
| `/dashboard/leads`                                   | Agent assigned leads                |
| `/dashboard/all-leads/[id]`, `/dashboard/leads/[id]` | Lead detail routes                  |
| `/dashboard/users`                                   | Team management                     |
| `/dashboard/import`                                  | Import / export                     |
| `/dashboard/billing`                                 | Fund account (USDT)                 |
| `/dashboard/subscription`                            | Plans & trial                       |
| `/dashboard/settings`                                | Appearance, dialer, datetime, …     |
| `/dashboard/notifications`                           | In-app tenants                      |
| `/api/leads/*`                                       | Lead CRUD, status, comments, assign |
| `/api/payments/*`                                    | Deposits & payment lifecycle        |
| `/api/subscription/*`                                | Status / subscribe                  |
| `/api/ably/*`                                        | Realtime tokens / scope             |
| `/api/auth/*`                                        | Signup, verify, password recovery   |

## Branding / multi-tenant hosts

Host presets live in `src/lib/appBranding.ts` (display name, support email, Telegram). Unknown hosts can fall back to `NEXT_PUBLIC_APP_NAME` in local/dev.

## SEO / crawlability notes

- Marketing sections ship SSR-friendly HTML where possible; below-fold client islands hydrate on view.
- `robots.ts` / `sitemap.ts` use `CANONICAL_APP_URL` / `NEXTAUTH_URL` / `NEXT_PUBLIC_APP_URL`.
- Dashboard and API routes are auth-protected and not meant for public indexing.

## Lead / billing model (product)

- Leads: name, email, phone, country, source, custom status, assignment, comments, activities, reminders.
- Status can be a legacy code or a tenant `Status` document id.
- Billing: generate USDT deposit address → confirm within the payment window → balance → subscribe to a plan (lead/user limits).

## Useful scripts

| Script                                                 | Purpose           |
| ------------------------------------------------------ | ----------------- |
| `npm run dev`                                          | Local development |
| `npm run build` / `npm start`                          | Production        |
| `npm run lint` / `npm run typecheck` / `npm run check` | Quality gates     |
| `npm test` / `npm run test:run`                        | Vitest (`src/tests/`) |
| `npm run test:e2e`                                     | Playwright (`e2e/`)   |

Full commands (import load, HTTP soak/pressure/concurrent, midflight kill, cleanup/seed) live in **[TESTING.md](./TESTING.md)**.

Unit/API/UI tests are consolidated under `src/tests/` (setup: `src/tests/setup.ts`). Playwright specs stay in `e2e/`.

## For AI / code reviewers

When asking an AI to review this repo, paste or attach:

1. This README
2. The specific files / PR diff under review
3. A scoped question (e.g. “review mobile overflow on `LeadDetailsPanel`” or “find assign/unassign race conditions”)

A bare GitHub link alone often fails if the tool cannot clone the repo or only sees a short README.

## License

Private project (`"private": true` in `package.json`). All rights reserved unless otherwise agreed.
