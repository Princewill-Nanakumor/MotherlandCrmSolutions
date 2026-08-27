/** Opt-in counters for HTTP import benches (`IMPORT_PERF_STATS=1`). */
export type ImportPerfSnapshot = {
  mongoRoundTrips: number;
  bulkWrites: number;
  quotaChecks: number;
  emailFinds: number;
  reconciles: number;
};

const state: ImportPerfSnapshot = {
  mongoRoundTrips: 0,
  bulkWrites: 0,
  quotaChecks: 0,
  emailFinds: 0,
  reconciles: 0,
};

export function resetImportPerfStats() {
  state.mongoRoundTrips = 0;
  state.bulkWrites = 0;
  state.quotaChecks = 0;
  state.emailFinds = 0;
  state.reconciles = 0;
}

export function noteImportMongoRt(n = 1) {
  if (process.env.IMPORT_PERF_STATS !== "1") return;
  state.mongoRoundTrips += n;
}

export function noteImportBulkWrite() {
  if (process.env.IMPORT_PERF_STATS !== "1") return;
  state.bulkWrites += 1;
  state.mongoRoundTrips += 1;
}

export function noteImportQuotaCheck() {
  if (process.env.IMPORT_PERF_STATS !== "1") return;
  state.quotaChecks += 1;
  // checkTenantLeadImportAllowed does countDocuments + users.findOne
  state.mongoRoundTrips += 2;
}

export function noteImportEmailFind() {
  if (process.env.IMPORT_PERF_STATS !== "1") return;
  state.emailFinds += 1;
  state.mongoRoundTrips += 1;
}

export function noteImportReconcile() {
  if (process.env.IMPORT_PERF_STATS !== "1") return;
  state.reconciles += 1;
  // billing findOne + countDocuments (+ optional deleteMany)
  state.mongoRoundTrips += 2;
}

export function getImportPerfStats(): ImportPerfSnapshot {
  return { ...state };
}
