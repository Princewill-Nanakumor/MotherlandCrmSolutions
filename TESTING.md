# Testing

How to run and maintain tests for Motherland CRM.

## Current suite (approximate)

- **146** Vitest tests (unit, API mocks, components)
- **6** Playwright tests that run (smoke + seeded lifecycle)
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
```

Requires a working `.env` (`MONGODB_URI`, `NEXTAUTH_SECRET`, etc.) for lifecycle E2E. Unit tests and Playwright smoke do not need the database. Seed is skipped automatically when `MONGODB_URI` is unset.

## What’s covered

| Layer | Location | What is tested |
|-------|----------|----------------|
| Domain helpers | `src/lib/**/*.test.ts`, `src/libs/**/*.test.ts` | Phone/country normalization, tenant scoping, search, billing rules, Ably channel names |
| Schemas | `src/schemas/*.test.ts` | Signup/login Zod validation |
| API routes | `src/app/api/**/*.test.ts` | Auth, tenant isolation, role checks with mocked session/DB |
| Components | `src/**/*.test.tsx` | Interactive UI (e.g. Import History delete modal) |
| CSV import | `src/utils/csvImport.test.ts` | Missing headers + valid CSV parsing |
| E2E smoke | `e2e/smoke.spec.ts` | Homepage, login fields, dashboard → login redirect |
| E2E lifecycle | `e2e/lead-lifecycle.spec.ts` | Seeded admin/agent: import → assign → comment → admin sees update → export |
| E2E realtime | `e2e/realtime-sync.spec.ts` | Browser↔browser Ably sync — skipped pending stabilization of Ably attach timing in headless environments |

## E2E users

`scripts/e2e-seed.mjs` upserts (defaults):

- Admin: `e2e-admin@motherland.test`
- Agent: `e2e-agent@motherland.test`
- Password: `E2eTest1!`

Override with `E2E_ADMIN_EMAIL`, `E2E_AGENT_EMAIL`, `E2E_PASSWORD` if needed. Playwright `globalSetup` runs the seed automatically before `test:e2e` when `MONGODB_URI` is set.

## Layout

- `vitest.config.mts` — unit/integration runner
- `playwright.config.ts` — E2E runner
- `src/test/setup.ts` — Testing Library setup
- `e2e/helpers/auth.ts` — login + `apiJson` helpers
- `e2e/global-setup.mjs` — seeds Mongo before E2E
- `.github/workflows/test.yml` — PR CI

## Not in git

Playwright output (`test-results/`, `playwright-report/`) is gitignored. Don’t commit pass/fail dumps; re-run the commands above for current results.

## Planned

- Re-enable realtime browser sync (Ably attach observability in headless)
- UI-only CSV upload E2E
- UI-only assign-dialog E2E
- Payment webhook / upgrade-downgrade tests
- Mongo large-dataset benchmarks (beyond in-memory `largeDatasetPerf.test.ts`)
