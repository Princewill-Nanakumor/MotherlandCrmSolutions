import { describe, expect, it } from "vitest";
import { getAdminScopeId, withAdminScope } from "./withAdminScope";
import type { AdminScopedSession } from "./withAdminScope";

function session(
  overrides: Partial<AdminScopedSession["user"]>,
): AdminScopedSession {
  return {
    expires: "2099-01-01T00:00:00.000Z",
    user: {
      id: "admin-1",
      role: "ADMIN",
      ...overrides,
    },
  } as AdminScopedSession;
}

describe("getAdminScopeId", () => {
  it("uses ADMIN user id as tenant scope", () => {
    expect(getAdminScopeId(session({ id: "tenant-a", role: "ADMIN" }))).toBe(
      "tenant-a",
    );
  });

  it("uses AGENT adminId as tenant scope", () => {
    expect(
      getAdminScopeId(
        session({ id: "agent-1", role: "AGENT", adminId: "tenant-a" }),
      ),
    ).toBe("tenant-a");
  });

  it("throws when AGENT has no adminId", () => {
    expect(() =>
      getAdminScopeId(session({ id: "agent-1", role: "AGENT" })),
    ).toThrow(/Admin scope could not be resolved/);
  });
});

describe("withAdminScope", () => {
  it("passes resolved adminId to handler", async () => {
    const result = await withAdminScope(
      session({ id: "tenant-b", role: "ADMIN" }),
      async (adminId) => `scoped:${adminId}`,
    );
    expect(result).toBe("scoped:tenant-b");
  });
});
