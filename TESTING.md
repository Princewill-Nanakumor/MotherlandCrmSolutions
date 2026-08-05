# Testing

How to run and maintain tests for Motherland CRM.

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
```

Requires a working `.env` (`MONGODB_URI`, `NEXTAUTH_SECRET`, etc.) for E2E. Unit tests do not need the database.

## What’s covered

| Layer | Location | Notes |
|-------|----------|--------|
| Domain helpers | `src/lib/**/*.test.ts`, `src/libs/**/*.test.ts` | Phone/country, tenancy, search, billing rules, Ably channel names |
| Schemas | `src/schemas/*.test.ts` | Signup/login Zod |
| API routes | `src/app/api/**/*.test.ts` | Auth/role checks with mocked session/DB |
| Components | `src/**/*.test.tsx` | e.g. Import History delete modal |
| CSV import | `src/utils/csvImport.test.ts` | Missing headers + valid CSV |
| E2E smoke | `e2e/smoke.spec.ts` | Homepage, login fields, dashboard → login |
| E2E lifecycle | `e2e/lead-lifecycle.spec.ts` | Seeded admin/agent: import → assign → comment → admin sees update → export |
| E2E realtime | `e2e/realtime-sync.spec.ts` | Browser↔browser Ably sync — currently **skipped** (`test.fixme`) |

## E2E users

`scripts/e2e-seed.mjs` upserts (defaults):

- Admin: `e2e-admin@motherland.test`
- Agent: `e2e-agent@motherland.test`
- Password: `E2eTest1!`

Override with `E2E_ADMIN_EMAIL`, `E2E_AGENT_EMAIL`, `E2E_PASSWORD` if needed. Playwright `globalSetup` runs the seed automatically before `test:e2e`.

## Layout

- `vitest.config.ts` — unit/integration runner
- `playwright.config.ts` — E2E runner
- `src/test/setup.ts` — Testing Library setup
- `e2e/helpers/auth.ts` — login + `apiJson` helpers
- `e2e/global-setup.mjs` — seeds Mongo before E2E

## Not in git

Playwright output (`test-results/`, `playwright-report/`) is gitignored. Don’t commit pass/fail dumps; re-run the commands above for current results.

## Known gaps

- Full Ably UI sync across two browsers (see `realtime-sync.spec.ts`)
- Pure UI CSV file-picker / assign-dialog flows (lifecycle uses authenticated APIs for those steps)
- Live Mongo load tests at 10k–50k rows (in-memory perf checks exist in `largeDatasetPerf.test.ts`)
- Payment webhooks / upgrade-downgrade payment APIs
