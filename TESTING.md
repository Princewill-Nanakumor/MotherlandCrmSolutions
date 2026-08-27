# Testing

How to run and maintain tests for Motherland CRM.

## Current suite (approximate)

- **236** Vitest tests (unit, API mocks, components) in `src/tests/`
- Playwright E2E in `e2e/` (smoke + lifecycle; opt-in import soak/pressure/concurrent)
- **1** Playwright realtime test **skipped** (`test.fixme`) — pending stabilization of Ably attach timing in headless browser environments

Counts drift as tests are added; re-run `npm run test:run` / `npm run test:e2e` for exact numbers.

## Testing strategy

Motherland CRM follows a layered testing approach:

- Unit tests verify business logic and utility functions.
- API tests verify authentication, authorization, tenant isolation, and request validation.
- Component tests verify interactive UI behavior.
- Playwright E2E verifies critical user workflows across the application.

Business rules are tested close to their implementation, while end-to-end tests focus on high-value workflows rather than exhaustive UI coverage. Multi-tenancy (admin scope isolation and agent assignment boundaries) is treated as a first-class concern across unit and API tests.

## CI

Every pull request (and pushes to `main`) runs GitHub Actions (`.github/workflows/test.yml`) on **Node 22**:

- Vitest (`npm run test:run`) — needs Node 22+ for jsdom component tests
- Playwright smoke (`e2e/smoke.spec.ts`)

Full lifecycle E2E requires MongoDB credentials and seeded test data, so it currently runs locally. It can be enabled in CI once repository secrets are configured.

## Commands

```bash
# Unit + API + component tests (Vitest)
npm run test:run

# Watch mode
npm test

# Seed disposable E2E users into Mongo (uses .env MONGODB_URI)
npm run test:e2e:seed

# Playwright (smoke + lifecycle; starts/reuses local Next on :3000)
npm run test:e2e

# Smoke only (same as CI E2E job)
npx playwright test e2e/smoke.spec.ts

# Level 4 — real Mongo import load + concurrent multi-tenant isolation (opt-in)
npm run test:import-load                    # quick: 100/500/1k + 3×1k
npm run test:import-load:correctness        # races, mid-fail+resume, index, upsert safety
npm run test:import-load:medium             # 5k/10k + 3×10k concurrent (headline)
npm run test:import-load:concurrent10k      # 3×10k concurrent only
npm run test:import-load:heavy              # 25k/50k + 5×10k
npm run test:import-load:stress             # 100k + 10×10k
IMPORT_LOAD_TENANTS=5 npm run test:import-load:medium
IMPORT_LOAD_BATCH_SIZE=5000 npm run test:import-load:medium
RUN_IMPORT_MONGO_LOAD=1 npm run test:import-load:vitest
```

Requires a working `.env` (`MONGODB_URI`, `NEXTAUTH_SECRET`, etc.) for lifecycle E2E and import load. Unit tests and Playwright smoke do not need the database. Seed is skipped automatically when `MONGODB_URI` is unset.

Import load writes only disposable `@import-load.motherland.test` users/leads and deletes them unless `IMPORT_LOAD_KEEP_DATA=1`. It mirrors the **inline `bulkWrite` upsert** write path (not per-row `Lead.create()`, not the product HTTP queue/worker). Default CI does **not** run it.

## What’s covered

| Layer          | Location                                        | What is tested                                                                                           |
| -------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Unit / API / UI | `src/tests/**`                                 | Domain helpers, schemas, API routes (mocked), components, CSV import                                     |
| Mongo import load | `scripts/import-load-harness.mjs` (opt-in)   | Real Mongo: throughput, dupes, invalid rows, memory/CPU, concurrent tenants, isolation                |
| E2E            | `e2e/**`                                        | Smoke, lifecycle, import soak/pressure/concurrent (opt-in), realtime (skipped)                           |

## E2E users

`scripts/e2e-seed.mjs` upserts (defaults):

- Admin: `e2e-admin@motherland.test`
- Agent: `e2e-agent@motherland.test`
- Password: `E2eTest1!`

Override with `E2E_ADMIN_EMAIL`, `E2E_AGENT_EMAIL`, `E2E_PASSWORD` if needed. Playwright `globalSetup` runs the seed automatically before `test:e2e` when `MONGODB_URI` is set.

## Layout

- `vitest.config.mts` — unit/integration runner (`src/tests/**`)
- `playwright.config.ts` — E2E runner (`e2e/**`)
- `src/tests/setup.ts` — Testing Library setup
- `e2e/helpers/auth.ts` — login + `apiJson` helpers
- `e2e/global-setup.mjs` — cleanup + seed before E2E
- `.github/workflows/test.yml` — PR CI

## Not in git

Playwright output (`test-results/`, `playwright-report/`) is gitignored. Don’t commit pass/fail dumps; re-run the commands above for current results.

## Planned

- Re-enable realtime browser sync (Ably attach observability in headless)
- UI-only CSV upload E2E
- UI-only assign-dialog E2E
- Payment webhook / upgrade-downgrade tests
- Collect Netlify soak artifacts (function duration/OOM) from a real deploy run of `test:import-http-soak:*`

## Completing the last three gaps

```bash
# 1) Real Mongo disconnect mid-import + resume
npm run test:import-midflight-kill

# 2) HTTP soak via real dashboard APIs (needs .env MONGODB_URI; globalSetup seeds E2E admin)
npm run test:import-http-soak              # default 10k
npm run test:import-http-soak:50k          # product max per upload
# Against Netlify:
PLAYWRIGHT_BASE_URL=https://YOUR_SITE.netlify.app npm run test:import-http-soak:50k

# 3) Browser UI pressure (file upload on /dashboard/import; same .env + seed)
npm run test:import-browser-pressure       # default 10k rows
npm run test:import-browser-pressure:50k
```

## Import HTTP path performance (50k before/after)

Measured with `npm run test:import-http-bench:50k` (dedicated Next on :3010, auto-kick disabled so staging/worker split is clean):

| metric | before (1k / drain 5 / per-chunk quota) | after (5k / drain 100 / job quota) | delta |
| --- | ---: | ---: | ---: |
| stage | 112.7s | 37.8s | −67% |
| worker | 462.4s | 161.7s | −65% |
| **total** | **579.8s (~9.7 min)** | **204.0s (~3.4 min)** | **−65%** |
| throughput | 86 leads/s | 245 leads/s | +184% |
| Mongo RTs (worker) | 210 | 12 | −94% |
| bulkWrites | 35* | 10 | — |
| quotaChecks / emailFinds | 35 / 35 | 0 / 0 | — |

\*Before profile still showed fewer counted bulkWrites than staging chunks in one run; treat RT/throughput totals as the headline.

Product defaults now: **5k client chunks**, **job-level quota** (create check + end-of-job cap), **worker drain 100 chunks/tick**.

### Concurrent / same-tenant HTTP

```bash
# Seed tenants A–E (unlimited maxLeads)
npm run test:e2e:seed-concurrent

# 5 × 50k through real stage → worker (long)
npm run test:import-http-concurrent:50k

# Same tenant: import #2 stays queued while #1 processes
IMPORT_STAGE_AUTO_KICK=0 npm run test:import-http-same-tenant
```

Policy: **one active processing import per tenant**; other same-tenant jobs remain `queued` until the active lease finishes. Different tenants may drain in parallel (`IMPORT_WORKER_MAX_JOBS`).

## Import recommendation triage

| Recommendation | Status |
| --- | --- |
| Concurrent multi-tenant load + isolation | Done |
| Detached worker + cron + cursor resume | Done |
| Chunked staging + progress UI + Ably | Done |
| Real mid-import Mongo kill + resume | Done (`test:import-midflight-kill`) |
| HTTP soak up to 50k (local or Netlify URL) | Done (opt-in Playwright; capped at product max) |
| Browser pressure large CSV | Done (opt-in Playwright) |
