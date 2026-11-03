import { beforeEach, describe, expect, it, vi } from "vitest";

const hasTenantDenormFlag = vi.fn();
const setTenantDenormFlag = vi.fn();

vi.mock("@/lib/tenantDenormFlags", () => ({
  hasTenantDenormFlag: (...args: unknown[]) => hasTenantDenormFlag(...args),
  setTenantDenormFlag: (...args: unknown[]) => setTenantDenormFlag(...args),
}));

describe("ensureTenantLastCallBackfill", () => {
  beforeEach(() => {
    vi.resetModules();
    hasTenantDenormFlag.mockReset();
    setTenantDenormFlag.mockReset();
  });

  it("skips the aggregation when the durable flag is already set", async () => {
    hasTenantDenormFlag.mockResolvedValue(true);
    const aggregate = vi.fn();
    const db = {
      collection: vi.fn(() => ({ aggregate })),
    };

    const { ensureTenantLastCallBackfill } = await import("@/lib/leadLastCall");
    await ensureTenantLastCallBackfill(db, "admin-1");

    expect(hasTenantDenormFlag).toHaveBeenCalled();
    expect(aggregate).not.toHaveBeenCalled();
    expect(setTenantDenormFlag).not.toHaveBeenCalled();
  });

  it("runs once then sets the durable flag", async () => {
    hasTenantDenormFlag.mockResolvedValue(false);
    setTenantDenormFlag.mockResolvedValue(undefined);
    const toArray = vi.fn().mockResolvedValue([
      { _id: "lead-1", createdAt: new Date("2024-06-01T00:00:00.000Z") },
    ]);
    const bulkWrite = vi.fn().mockResolvedValue({ acknowledged: true });
    const aggregate = vi.fn(() => ({ toArray }));
    const collection = vi.fn((name: string) => {
      if (name === "activities") return { aggregate };
      if (name === "leads") return { bulkWrite };
      return {};
    });
    const db = { collection };

    const { ensureTenantLastCallBackfill } = await import("@/lib/leadLastCall");
    await ensureTenantLastCallBackfill(db, "admin-1");
    await ensureTenantLastCallBackfill(db, "admin-1");

    expect(aggregate).toHaveBeenCalledTimes(1);
    expect(bulkWrite).toHaveBeenCalledTimes(1);
    expect(setTenantDenormFlag).toHaveBeenCalledWith(
      db,
      "admin-1",
      "lastCallBackfilledAt",
    );
  });
});
