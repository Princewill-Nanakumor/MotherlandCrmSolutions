import { describe, expect, it, beforeEach, vi } from "vitest";

const findById = vi.fn();

vi.mock("@/models/User", () => ({
  default: {
    findById: (...args: unknown[]) => findById(...args),
  },
}));

vi.mock("@/libs/dbConfig", () => ({
  connectMongoDB: vi.fn().mockResolvedValue(undefined),
}));

describe("sessionRbac", () => {
  beforeEach(() => {
    findById.mockReset();
    vi.resetModules();
  });

  it("returns sanitized sub-admin permissions from the user document", async () => {
    findById.mockReturnValue({
      select: () => ({
        lean: async () => ({
          role: "SUBADMIN",
          permissions: ["ASSIGN_LEADS", "NOT_REAL"],
          status: "ACTIVE",
          adminId: "owner-1",
          canViewEmails: true,
          canViewPhoneNumbers: false,
        }),
      }),
    });

    const { getSessionRbacFromDbCached, invalidateSessionRbacCache } =
      await import("./sessionRbac");
    invalidateSessionRbacCache("user-1");

    const snap = await getSessionRbacFromDbCached("user-1");
    expect(snap).toEqual({
      role: "SUBADMIN",
      permissions: ["ASSIGN_LEADS"],
      status: "ACTIVE",
      adminId: "owner-1",
      canViewEmails: true,
      canViewPhoneNumbers: false,
    });
  });
});
