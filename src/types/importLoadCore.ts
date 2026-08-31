export type ImportLoadProfile = {
  singleSizes: number[];
  concurrentPerTenant: number;
  tenantCount: number;
  duplicatePassSize: number;
  invalidMixSize: number;
};

export type ImportLoadTenantResult = {
  inserted: number;
  duplicates: number;
  failedRecords: number;
  errors: number;
  elapsedMs: number;
  memory: {
    after: { heapUsedMb: number };
    peakRssMb?: number;
    peakHeapMb?: number;
  };
  dbOps: { bulkWrite: number };
  architecture: { writeApi: string; harnessWriteMode: string };
  batchSize: number;
  dbRoundTrips: number;
  label?: string;
};

export type ImportLoadSuiteReport = {
  failures: string[];
  ok: boolean;
  singleTenant: ImportLoadTenantResult[];
  concurrent: { results: ImportLoadTenantResult[] } | null;
  duplicatePass: { duplicates: number } | null;
  isolation: { ok: boolean } | null;
  sameEmailAcrossTenants: { ok: boolean } | null;
};
