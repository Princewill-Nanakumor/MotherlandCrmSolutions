import { describe, expect, it } from "vitest";
import {
  canAccessAdminManagement,
  getDashboardRoleRedirect,
} from "./dashboardAccess";

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
