import { describe, expect, it } from "vitest";
import {
  MAX_LEADS_PER_IMPORT,
  getPerImportLimitError,
} from "@/lib/importBatchLimits";

describe("importBatchLimits", () => {
  it("accepts boundary sizes at and under the cap", () => {
    expect(getPerImportLimitError(49_999)).toBeNull();
    expect(getPerImportLimitError(50_000)).toBeNull();
    expect(getPerImportLimitError(MAX_LEADS_PER_IMPORT)).toBeNull();
  });

  it("rejects just over the cap and large oversize files", () => {
    expect(getPerImportLimitError(50_001)).toMatch(/50,000/);
    expect(getPerImportLimitError(100_000)).toMatch(/50,000/);
    expect(getPerImportLimitError(100_000)).toMatch(/100,000/);
  });

  it("rejects invalid counts", () => {
    expect(getPerImportLimitError(Number.NaN)).toMatch(/Invalid/);
    expect(getPerImportLimitError(-1)).toMatch(/Invalid/);
  });
});
