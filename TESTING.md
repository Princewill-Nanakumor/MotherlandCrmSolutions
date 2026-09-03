# Testing

How to run and maintain tests for Motherland CRM.

## Current suite (verified locally)

| Layer | Command | Result (latest full local pass) |
| --- | --- | --- |
| Unit / API / UI | `npm run test:run` | Vitest in `src/tests/` — all green |
| E2E default | `npm run test:e2e` (+ seed) | Smoke + seeded lifecycle pass; opt-in import specs + realtime skipped unless env flags set |
| Mongo import harness | `npm run test:import-load*` | quick → stress: **ok** (isolation + correctness) |
| Midflight kill | `npm run test:import-midflight-kill` | partial → resume → **2400/2400** |
| HTTP soak | `test:import-http-soak` / `:50k` | 10k ~165 leads/s; 50k ~134 leads/s on `:3000` |
| HTTP bench | `test:import-http-bench:50k` | after profile ~**217 leads/s**, −59% wall vs before |
| HTTP concurrent | `test:import-http-concurrent:50k` | **5 × 50k** completed (~684–739 aggregate leads/s) |
| Same-tenant queue | `test:import-http-same-tenant` | #2 waits while #1 processes |
| Browser pressure | `:10k` / `:50k` | UI upload completed (10k ~59s, 50k ~210s) |
| Assign bulk bench | `test:assign-bulk-bench` / `:200` | Times assign → reassign → bulk status → unassign (max 500, API-only). Bulk status uses `updateMany` + chunked activity inserts (no long Atlas txn). |
| Assign bulk UI | `test:assign-bulk-ui` / `:25` | Same flow via All Leads UI: dialogs, toasts, table sync (default 10, max 50). Use `test:assign-bulk-ui:fresh` if `:3000` dev is hung. |
| Bulk realtime sync | `test:bulk-realtime-sync` | Two browsers + Ably; **requires `ABLY_API_KEY` in `.env`** (skipped when unset) |

Counts drift as tests are added; re-run the commands above for exact numbers.

## Limits (product)

| Cap | Value | Meaning |
| --- | ---: | --- |
| Per **upload** | **50,000** | Hard file/API batch max (`MAX_LEADS_PER_IMPORT`) — all plans |
| Starter total | 10,000 | Subscription `maxLeads` |
| Professional total | 30,000 | Subscription `maxLeads` |
| Enterprise total | **unlimited** (`-1`) | Unlimited stored leads/seats; still **50k per upload** |

Covered by `src/tests/subscriptionImportLimits.test.ts`, `importBatchLimits.test.ts`, `tenantLeadImportLimits.test.ts`, `billingFlows.test.ts`.

## Testing strategy

- Unit tests verify business logic and utility functions.
- API tests verify authentication, authorization, tenant isolation, and request validation.
- Component tests verify interactive UI behavior.
- Playwright E2E verifies critical user workflows.
- Opt-in Mongo / HTTP load tests verify import throughput, isolation, resume, and UI pressure.

Business rules stay close to implementation; E2E focuses on high-value flows. Multi-tenancy is a first-class concern.

## CI

Every pull request (and pushes to `main`) runs GitHub Actions (`.github/workflows/test.yml`) on **Node 22**:

- Vitest (`npm run test:run`)
- Playwright smoke (`e2e/smoke.spec.ts`)

Full lifecycle + import load/soak need Mongo secrets and are **local / opt-in** today.

## Commands

### Always / CI-shaped

```bash
npm run test:run          # Vitest (src/tests/)
npm test                  # Vitest watch
npm run test:e2e:seed     # upsert e2e-admin / e2e-agent
npm run test:e2e          # Playwright (smoke + lifecycle; opt-ins skipped without flags)
npx playwright test e2e/smoke.spec.ts
npm run test:e2e:cleanup  # delete disposable e2e / import-load leads
```

### Level 4 — Mongo import harness (inline `bulkWrite`, not HTTP worker)

```bash
npm run test:import-load                 # quick: 100/500/1k + 3×1k
npm run test:import-load:correctness     # races, mid-fail+resume, index, upsert
npm run test:import-load:medium          # 5k/10k + 3×10k (headline)
npm run test:import-load:standard        # alias of medium
npm run test:import-load:concurrent10k   # 3×10k concurrent only
npm run test:import-load:heavy           # 25k/50k + 5×10k
npm run test:import-load:stress          # 100k + 10×10k
npm run test:import-load:vitest          # gated Vitest wrapper (needs RUN_IMPORT_MONGO_LOAD=1)
npm run test:import-midflight-kill       # disconnect mid-write + resume
```

Profiles: `quick`, `correctness`, `medium`, `standard`, `concurrent10k`, `heavy`, `stress`.  
Optional: `IMPORT_LOAD_TENANTS`, `IMPORT_LOAD_BATCH_SIZE`, `IMPORT_LOAD_KEEP_DATA=1`.

Harness uses disposable `@import-load.motherland.test` data and cleans up unless keep is set. It mirrors **inline bulkWrite upsert** — not the product stage→worker path.

### Product HTTP path (stage → worker)

```bash
npm run test:import-http-soak              # 10k
npm run test:import-http-soak:50k          # max per upload
npm run test:import-http-bench:50k         # before/after on :3010 (IMPORT_PERF_STATS=1)
npm run test:e2e:seed-concurrent           # tenants A–E (unlimited maxLeads)
npm run test:import-http-concurrent        # multi-tenant (default size)
npm run test:import-http-concurrent:50k    # 5 × 50k
npm run test:import-http-same-tenant       # #2 queued while #1 processes
npm run test:import-browser-pressure       # UI CSV 10k
npm run test:import-browser-pressure:50k   # UI CSV 50k

# All Leads bulk assign / reassign / status / unassign speed (max 500 = agent cap, API-only)
npm run test:assign-bulk-bench:200
npm run test:assign-bulk-bench             # 500

# Same bulk flow through the All Leads UI (dialogs, loading, toasts, table columns)
npm run test:assign-bulk-ui                # 10 leads (reuses dev on :3000 if running)
npm run test:assign-bulk-ui:25             # 25 leads (max ASSIGN_UI_SIZE=50)
npm run test:assign-bulk-ui:fresh          # starts dev on :3001 (use when :3000 is hung)

# Two-browser Ably sync (needs ABLY_API_KEY uncommented in .env)
npm run test:bulk-realtime-sync
npm run test:bulk-realtime-sync:fresh      # starts dev on :3001

# Lead panel reminder UI (create → timeline → complete → delete)
npm run test:reminder-flow

# Correctness (Vitest, no Mongo): 500 selected / 50 pre-assigned → 450
npm run test:run -- src/tests/api.leads.bulk-assign.route.test.ts
```

Needs `.env` (`MONGODB_URI`, `NEXTAUTH_SECRET`, …). Set `IMPORT_PERF_STATS=1` on the Next process if you want `mongo:` counters in soak reports (plain `npm run dev` often shows zeros).

## What’s covered

| Layer | Location | What is tested |
| --- | --- | --- |
| Unit / API / UI | `src/tests/**` | Domain helpers, schemas, mocked API routes, components, CSV import, session/RBAC, subscription vs per-upload caps |
| Mongo import load | `scripts/import-load-harness.mjs` | Throughput, dupes, invalid rows, concurrent tenants, isolation, correctness |
| Midflight | `scripts/import-midflight-kill.mjs` | Kill during write + cursor resume |
| HTTP import | `e2e/import-http-*.spec.ts` | Stage+worker soak, bench, concurrent, same-tenant queue |
| Browser import | `e2e/import-browser-pressure.spec.ts` | Large CSV via `/dashboard/import` |
| Assign bulk bench | `e2e/assignment-bulk-bench.spec.ts` | HTTP speed: assign → reassign → bulk status → unassign (≤500) |
| Assign bulk UI | `e2e/assignment-bulk-ui.spec.ts` | UI sync: bulk bar, dialogs, loading, toasts, Assigned To / status columns (≤50) |
| Bulk realtime sync | `test:bulk-realtime-sync` | Two browsers: admin list + open panel + agent list after bulk assign/reassign |
| Bulk assign correctness | `src/tests/api.leads.bulk-assign.route.test.ts` | 500 selected / 50 already assigned → 450 updates + 450 activities + 1 Ably call |
| E2E smoke / lifecycle | `e2e/smoke.spec.ts`, `lead-lifecycle.spec.ts` | Public pages + admin/agent import→assign→comment→export |
| E2E reminder flow | `e2e/reminder-flow.spec.ts` | Create / timeline log / complete / delete in the lead panel (opt-in `REMINDER_FLOW_E2E=1`) |
| E2E realtime | `e2e/realtime-sync.spec.ts` | Skipped (`test.fixme`) pending Ably headless attach |

## E2E users

`scripts/e2e-seed.mjs`:

- Admin: `e2e-admin@motherland.test`
- Agent: `e2e-agent@motherland.test`
- Password: `E2eTest1!`

- Concurrent: `e2e-admin-a@…` … `e2e-admin-e@…` via `npm run test:e2e:seed-concurrent`.
- Agent B (reassign bench): `e2e-agent-b@motherland.test` (created by `test:e2e:seed`)

Override with `E2E_ADMIN_EMAIL`, `E2E_AGENT_EMAIL`, `E2E_AGENT_B_EMAIL`, `E2E_PASSWORD`. Playwright `globalSetup` cleans disposable data then seeds when `MONGODB_URI` is set.

## Layout

- `vitest.config.mts` — unit runner (`src/tests/**`, setup `src/tests/setup.ts`)
- `playwright.config.ts` — E2E (`e2e/**`)
- `e2e/helpers/auth.ts` — login + `apiJson`
- `e2e/global-setup.mjs` — cleanup + seed
- `scripts/lib/importLoadCore.mjs` — harness profiles
- `.github/workflows/test.yml` — PR CI

## Not in git

`test-results/`, `playwright-report/` are gitignored. Don’t commit pass/fail dumps.

## Latest verified import numbers (local Atlas)

Harness (inline bulkWrite, batch 5000):

| Profile | Headline | ok |
| --- | --- | --- |
| quick | 1k @ ~221/s; 3×1k concurrent ~273 aggregate/s | true |
| correctness | races + resume | true |
| medium / standard | 10k @ ~554–713/s; 3×10k ~922 aggregate/s | true |
| heavy | 50k @ ~555/s; 5×10k ~1177 aggregate/s | true |
| stress | 100k @ ~582/s; 10×10k ~1858 aggregate/s | true |
| midflight-kill | 400 partial → resume **2400** | true |

HTTP product path:

| Run | Result |
| --- | --- |
| soak 10k | ~165 leads/s total (~61s) |
| soak 50k | ~134 leads/s total (~6.2 min) on `:3000` |
| bench 50k **before** (1k / drain 5 / per-chunk) | ~89 leads/s, 210 Mongo RTs |
| bench 50k **after** (5k / drain 100 / job) | ~217 leads/s, 12 Mongo RTs (−59% wall) |
| concurrent 5×50k | all completed (~684–739 aggregate leads/s) |
| same-tenant | both 5k completed; second waited |
| browser 10k / 50k | completed |

Product defaults: **5k client chunks**, **job-level quota**, **worker drain 100 chunks/tick**. Policy: **one active processing import per tenant**; parallel across tenants via `IMPORT_WORKER_MAX_JOBS`.

## Import recommendation triage

| Recommendation | Status |
| --- | --- |
| Concurrent multi-tenant load + isolation | Done |
| Detached worker + cron + cursor resume | Done |
| Chunked staging + progress UI + Ably | Done |
| Real mid-import Mongo kill + resume | Done (`test:import-midflight-kill`) |
| HTTP soak up to 50k | Done (opt-in Playwright) |
| Browser pressure large CSV | Done (opt-in Playwright) |
| Same-tenant queue + multi-tenant HTTP | Done |
| Plan totals vs 50k/upload | Done (unit tests) |

## Planned

- Re-enable realtime browser sync (Ably attach in headless)
- UI-only assign-dialog E2E
- Payment webhook / upgrade-downgrade E2E
- Netlify soak artifacts (duration/OOM) from a real deploy
