import { describe, expect, it } from "vitest";
import {
  canAccessAdminManagement,
  getDashboardRoleRedirect,
} from "@/lib/dashboardAccess";

describe("getDashboardRoleRedirect", () => {
  it("sends AGENT away from admin-only routes", () => {
    expect(getDashboardRoleRedirect("/dashboard/import", "AGENT")).toBe(
      "/dashboard/leads",
    );
    expect(getDashboardRoleRedirect("/dashboard/users", "AGENT")).toBe(
      "/dashboard/leads",
    );
  });

  it("sends ADMIN away from agent leads routes", () => {
    expect(getDashboardRoleRedirect("/dashboard/leads", "ADMIN")).toBe(
      "/dashboard/all-leads",
    );
    expect(getDashboardRoleRedirect("/dashboard/leads/abc", "ADMIN")).toBe(
      "/dashboard/all-leads",
    );
  });

  it("allows ADMIN on all-leads and AGENT on leads", () => {
    expect(getDashboardRoleRedirect("/dashboard/all-leads", "ADMIN")).toBeNull();
    expect(getDashboardRoleRedirect("/dashboard/leads", "AGENT")).toBeNull();
    expect(getDashboardRoleRedirect("/dashboard/profile", "AGENT")).toBeNull();
  });

  it("lets SUBADMIN with ASSIGN_LEADS use All Leads instead of agent leads", () => {
    expect(
      getDashboardRoleRedirect("/dashboard/all-leads", "SUBADMIN", [
        "ASSIGN_LEADS",
      ]),
    ).toBeNull();
    expect(
      getDashboardRoleRedirect("/dashboard/leads", "SUBADMIN", ["ASSIGN_LEADS"]),
    ).toBe("/dashboard/all-leads");
    expect(
      getDashboardRoleRedirect("/dashboard/all-leads", "SUBADMIN", []),
    ).toBe("/dashboard/leads");
  });

  it("blocks SUBADMIN from Users, billing, and other owner pages", () => {
    expect(
      getDashboardRoleRedirect("/dashboard/users", "SUBADMIN", [
        "ASSIGN_LEADS",
      ]),
    ).toBe("/dashboard/all-leads");
    expect(
      getDashboardRoleRedirect("/dashboard/billing", "SUBADMIN", [
        "ASSIGN_LEADS",
      ]),
    ).toBe("/dashboard/all-leads");
    expect(
      getDashboardRoleRedirect("/dashboard/import", "SUBADMIN", [
        "ASSIGN_LEADS",
      ]),
    ).toBe("/dashboard/all-leads");
    expect(
      getDashboardRoleRedirect("/dashboard/subscription", "SUBADMIN", [
        "ASSIGN_LEADS",
      ]),
    ).toBe("/dashboard/all-leads");
    expect(
      getDashboardRoleRedirect("/dashboard/help", "SUBADMIN", ["ASSIGN_LEADS"]),
    ).toBe("/dashboard/all-leads");
  });
});

describe("canAccessAdminManagement", () => {
  it("allows when allowlist empty", () => {
    expect(canAccessAdminManagement("a@x.com", [])).toBe(true);
  });

  it("enforces SUPER_ADMIN allowlist", () => {
    expect(canAccessAdminManagement("a@x.com", ["boss@x.com"])).toBe(false);
    expect(canAccessAdminManagement("boss@x.com", ["boss@x.com"])).toBe(true);
  });
});
