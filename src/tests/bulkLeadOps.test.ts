import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import {
  formatAssigneeName,
  getEmbeddedAssignee,
} from "@/lib/bulkLeadOps";

describe("bulkLeadOps", () => {
  it("reads embedded assignee names without a user lookup", () => {
    const oid = new mongoose.Types.ObjectId();
    const assignee = getEmbeddedAssignee({
      _id: oid,
      firstName: "E2E",
      lastName: "Agent",
    });
    expect(assignee?._id?.toString()).toBe(oid.toString());
    expect(formatAssigneeName(assignee)).toBe("E2E Agent");
  });

  it("returns fallback when assignee is missing", () => {
    expect(formatAssigneeName(null)).toBe("Unknown User");
    expect(getEmbeddedAssignee(null)).toBeNull();
  });
});
