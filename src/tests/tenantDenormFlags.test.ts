import { describe, expect, it, vi } from "vitest";
import {
  hasTenantDenormFlag,
  setTenantDenormFlag,
} from "@/lib/tenantDenormFlags";

describe("tenantDenormFlags", () => {
  it("hasTenantDenormFlag is true when the field is set", async () => {
    const findOne = vi.fn().mockResolvedValue({
      _id: "admin-1",
      lastCallBackfilledAt: new Date(),
    });
    const db = { collection: () => ({ findOne }) };

    await expect(
      hasTenantDenormFlag(db, "admin-1", "lastCallBackfilledAt"),
    ).resolves.toBe(true);
    expect(findOne).toHaveBeenCalledWith(
      { _id: "admin-1", lastCallBackfilledAt: { $exists: true, $ne: null } },
      { projection: { lastCallBackfilledAt: 1 } },
    );
  });

  it("hasTenantDenormFlag is false when missing", async () => {
    const findOne = vi.fn().mockResolvedValue(null);
    const db = { collection: () => ({ findOne }) };

    await expect(
      hasTenantDenormFlag(db, "admin-1", "lastCommentBackfilledAt"),
    ).resolves.toBe(false);
  });

  it("setTenantDenormFlag upserts the timestamp", async () => {
    const updateOne = vi.fn().mockResolvedValue({ acknowledged: true });
    const db = { collection: () => ({ updateOne }) };

    await setTenantDenormFlag(db, "admin-1", "lastCallBackfilledAt");

    expect(updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: "admin-1" });
    expect(update.$set.lastCallBackfilledAt).toBeInstanceOf(Date);
    expect(options).toEqual({ upsert: true });
  });
});
