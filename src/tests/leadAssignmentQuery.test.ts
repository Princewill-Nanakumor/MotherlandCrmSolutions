import { describe, expect, it } from "vitest";
import mongoose from "mongoose";
import {
  MAX_ASSIGNED_LEADS_PER_AGENT,
  MAX_ASSIGNED_LEADS_PER_SUBADMIN,
  assertAssignmentCapacity,
  countAssignmentsTowardCapacity,
  formatAssignmentCapacityError,
  getLeadAssigneeId,
  maxAssignedLeadsForRole,
  singleLeadAccessFilter,
  agentAssignedToUserClause,
} from "@/lib/leadAssignmentQuery";

describe("getLeadAssigneeId", () => {
  it("reads string assignee", () => {
    expect(getLeadAssigneeId("agent-1")).toBe("agent-1");
  });

  it("reads populated object _id", () => {
    expect(getLeadAssigneeId({ _id: "agent-2", name: "Sam" })).toBe("agent-2");
  });

  it("reads ObjectId assignee", () => {
    const id = new mongoose.Types.ObjectId();
    expect(getLeadAssigneeId(id)).toBe(id.toString());
  });

  it("returns null for missing assignee", () => {
    expect(getLeadAssigneeId(null)).toBeNull();
  });
});

describe("agentAssignedToUserClause", () => {
  it("matches string and ObjectId shapes", () => {
    const clause = agentAssignedToUserClause("507f1f77bcf86cd799439011");
    expect(clause.$or.length).toBeGreaterThan(3);
  });
});

describe("countAssignmentsTowardCapacity", () => {
  it("counts leads not already on the target", () => {
    expect(
      countAssignmentsTowardCapacity(
        [
          { assignedTo: null },
          { assignedTo: "other" },
          { assignedTo: "target" },
          { assignedTo: { _id: "target" } },
        ],
        "target",
      ),
    ).toBe(2);
  });
});

describe("singleLeadAccessFilter", () => {
  const leadId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();
  const agentId = "agent-1";

  it("scopes agents to assigned leads", () => {
    const filter = singleLeadAccessFilter(leadId, adminId, "AGENT", agentId);
    expect(filter).toHaveProperty("$and");
  });

  it("grants tenant-wide access when canSeeAllTenantLeads", () => {
    expect(
      singleLeadAccessFilter(leadId, adminId, "ADMIN", agentId, true),
    ).toEqual({
      _id: leadId,
      adminId,
    });
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

describe("maxAssignedLeadsForRole", () => {
  it("uses 500 for agents and 2000 for sub-admins", () => {
    expect(maxAssignedLeadsForRole("AGENT")).toBe(MAX_ASSIGNED_LEADS_PER_AGENT);
    expect(maxAssignedLeadsForRole("SUBADMIN")).toBe(
      MAX_ASSIGNED_LEADS_PER_SUBADMIN,
    );
    expect(maxAssignedLeadsForRole(undefined)).toBe(
      MAX_ASSIGNED_LEADS_PER_AGENT,
    );
  });
});

describe("assertAssignmentCapacity", () => {
  it("allows assignments under the agent cap", () => {
    expect(() =>
      assertAssignmentCapacity(10, 5, "AGENT"),
    ).not.toThrow();
  });

  it("throws when exceeding the agent cap", () => {
    expect(() =>
      assertAssignmentCapacity(MAX_ASSIGNED_LEADS_PER_AGENT, 1, "AGENT"),
    ).toThrow(/already has 500 assigned leads \(maximum 500\)/);
  });

  it("allows a sub-admin past the agent 500 cap within the 2000 total", () => {
    expect(() =>
      assertAssignmentCapacity(MAX_ASSIGNED_LEADS_PER_AGENT, 60, "SUBADMIN"),
    ).not.toThrow();
  });

  it("throws when a sub-admin would exceed 2000", () => {
    expect(() =>
      assertAssignmentCapacity(
        MAX_ASSIGNED_LEADS_PER_SUBADMIN,
        1,
        "SUBADMIN",
      ),
    ).toThrow(
      new RegExp(
        `already has ${MAX_ASSIGNED_LEADS_PER_SUBADMIN} assigned leads \\(maximum ${MAX_ASSIGNED_LEADS_PER_SUBADMIN}\\)`,
      ),
    );
  });

  it("ignores non-positive net new", () => {
    expect(() =>
      assertAssignmentCapacity(MAX_ASSIGNED_LEADS_PER_AGENT, 0, "AGENT"),
    ).not.toThrow();
  });
});

describe("formatAssignmentCapacityError", () => {
  it("explains remaining room against the role-specific total cap", () => {
    expect(formatAssignmentCapacityError("AGENT", 495)).toBe(
      `This user already has 495 assigned leads (maximum ${MAX_ASSIGNED_LEADS_PER_AGENT}). You can assign at most 5 more.`,
    );
    expect(formatAssignmentCapacityError("SUBADMIN", 500)).toBe(
      `This user already has 500 assigned leads (maximum ${MAX_ASSIGNED_LEADS_PER_SUBADMIN}). You can assign at most ${MAX_ASSIGNED_LEADS_PER_SUBADMIN - 500} more.`,
    );
  });
});
