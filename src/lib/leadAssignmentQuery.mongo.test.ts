import { describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import {
  agentLeadsInTenantFilter,
  countLeadsAssignedToAgent,
} from "./leadAssignmentQuery";

describe("countLeadsAssignedToAgent (mongo mock)", () => {
  it("counts with tenant + assignment filter", async () => {
    const adminId = new mongoose.Types.ObjectId();
    const agentId = new mongoose.Types.ObjectId().toString();
    const countDocuments = vi.fn().mockResolvedValue(12);

    const count = await countLeadsAssignedToAgent(
      { countDocuments },
      adminId,
      agentId,
    );

    expect(count).toBe(12);
    expect(countDocuments).toHaveBeenCalledWith(
      agentLeadsInTenantFilter(adminId, agentId),
    );
  });
});
