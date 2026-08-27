import { describe, expect, it } from "vitest";
import { isAdminOnlyDashboardPath } from "@/lib/dashboardAdminOnlyPaths";

describe("isAdminOnlyDashboardPath", () => {
  it("flags admin-only routes", () => {
    expect(isAdminOnlyDashboardPath("/dashboard/import")).toBe(true);
    expect(isAdminOnlyDashboardPath("/dashboard/users")).toBe(true);
    expect(isAdminOnlyDashboardPath("/dashboard/all-leads")).toBe(true);
    expect(isAdminOnlyDashboardPath("/dashboard/billing")).toBe(true);
  });

  it("flags nested admin-only paths", () => {
    expect(isAdminOnlyDashboardPath("/dashboard/payment-details/abc")).toBe(
      true,
    );
    expect(isAdminOnlyDashboardPath("/dashboard/admin-management/x")).toBe(
      true,
    );
  });

  it("allows agent-accessible routes", () => {
    expect(isAdminOnlyDashboardPath("/dashboard/leads")).toBe(false);
    expect(isAdminOnlyDashboardPath("/dashboard")).toBe(false);
    expect(isAdminOnlyDashboardPath("/dashboard/profile")).toBe(false);
    expect(isAdminOnlyDashboardPath("/dashboard/settings")).toBe(false);
  });

  it("handles null pathname", () => {
    expect(isAdminOnlyDashboardPath(null)).toBe(false);
  });
});
