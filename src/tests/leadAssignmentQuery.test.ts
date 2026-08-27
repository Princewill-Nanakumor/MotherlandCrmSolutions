import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import {
  MAX_ASSIGNED_LEADS_PER_AGENT,
  assertAssignmentCapacity,
  formatAssignmentCapacityError,
  getLeadAssigneeId,
  singleLeadAccessFilter,
} from "@/lib/leadAssignmentQuery";

describe("getLeadAssigneeId", () => {
  it("reads string assignee", () => {
    expect(getLeadAssigneeId("agent-1")).toBe("agent-1");
  });

  it("reads populated object _id", () => {
    expect(getLeadAssigneeId({ _id: "agent-2", name: "Sam" })).toBe("agent-2");
  });

  it("returns null for missing assignee", () => {
    expect(getLeadAssigneeId(null)).toBeNull();
    expect(getLeadAssigneeId(undefined)).toBeNull();
  });
});

describe("singleLeadAccessFilter", () => {
  const leadId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const agentId = new mongoose.Types.ObjectId().toString();

  it("scopes ADMIN by lead + tenant only when canSeeAllTenantLeads is true", () => {
    expect(
      singleLeadAccessFilter(leadId, adminId, "ADMIN", "admin-user", true),
    ).toEqual({
      _id: leadId,
      adminId,
    });
  });

  it("does not grant tenant-wide access by role alone", () => {
    expect(
      singleLeadAccessFilter(leadId, adminId, "ADMIN", "admin-user"),
    ).toHaveProperty("$and");
  });

  it("requires assignment for AGENT", () => {
    const filter = singleLeadAccessFilter(leadId, adminId, "AGENT", agentId);
    expect(filter).toHaveProperty("$and");
    const and = (filter as { $and: unknown[] }).$and;
    expect(and[0]).toEqual({ _id: leadId, adminId });
  });

  it("requires assignment for SUBADMIN unless canSeeAllTenantLeads", () => {
    const filter = singleLeadAccessFilter(leadId, adminId, "SUBADMIN", agentId);
    expect(filter).toHaveProperty("$and");
    expect(
      singleLeadAccessFilter(leadId, adminId, "SUBADMIN", agentId, true),
    ).toEqual({
      _id: leadId,
      adminId,
    });
  });
});

describe("assertAssignmentCapacity", () => {
  it("allows assignments under the cap", () => {
    expect(() =>
      assertAssignmentCapacity("Ada", "Agent", 10, 5),
    ).not.toThrow();
  });

  it("throws when exceeding MAX_ASSIGNED_LEADS_PER_AGENT", () => {
    expect(() =>
      assertAssignmentCapacity(
        "Ada",
        "Agent",
        MAX_ASSIGNED_LEADS_PER_AGENT,
        1,
      ),
    ).toThrow(/Cannot assign 1 lead/);
  });

  it("ignores non-positive net new", () => {
    expect(() =>
      assertAssignmentCapacity("Ada", "Agent", MAX_ASSIGNED_LEADS_PER_AGENT, 0),
    ).not.toThrow();
  });
});

describe("formatAssignmentCapacityError", () => {
  it("includes remaining capacity", () => {
    const msg = formatAssignmentCapacityError("Ada", "Agent", 498, 5);
    expect(msg).toContain("maximum 500");
    expect(msg).toContain("at most 2 more");
  });
});
