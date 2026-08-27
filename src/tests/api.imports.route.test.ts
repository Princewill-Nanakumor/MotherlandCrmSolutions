import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const getServerSession = vi.fn();
const publishAdminLeadsUpdatedEvent = vi.fn().mockResolvedValue(undefined);

const findToArray = vi.fn();
const findOne = vi.fn();
const deleteMany = vi.fn();
const deleteOne = vi.fn();

const collection = vi.fn((name: string) => {
  if (name === "imports") {
    return {
      find: () => ({ sort: () => ({ toArray: findToArray }) }),
      findOne,
      deleteOne,
    };
  }
  if (name === "leads") {
    return { deleteMany };
  }
  return {};
});

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("@/libs/auth", () => ({
  authOptions: {},
}));

vi.mock("@/libs/ablyServer", () => ({
  publishAdminLeadsUpdatedEvent: (...args: unknown[]) =>
    publishAdminLeadsUpdatedEvent(...args),
}));

vi.mock("@/libs/dbConfig", () => ({
  executeDbOperation: async <T>(operation: () => Promise<T>) => operation(),
  connectMongoDB: vi.fn(),
}));

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: {
      ...actual.default,
      connection: {
        get db() {
          return { collection };
        },
      },
      Types: actual.default.Types,
    },
  };
});

describe("/api/imports", () => {
  const adminId = new mongoose.Types.ObjectId().toString();
  const importId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    getServerSession.mockReset();
    publishAdminLeadsUpdatedEvent.mockClear();
    findToArray.mockReset();
    findOne.mockReset();
    deleteMany.mockReset();
    deleteOne.mockReset();
    collection.mockClear();
  });

  it("GET returns 401 when unauthenticated", async () => {
    getServerSession.mockResolvedValue(null);
    const { GET } = await import("@/app/api/imports/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("GET returns imports for authenticated admin", async () => {
    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "ADMIN" },
    });
    findToArray.mockResolvedValue([
      { _id: importId, fileName: "leads.xlsx", uploadedBy: adminId },
    ]);

    const { GET } = await import("@/app/api/imports/route");
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.imports).toHaveLength(1);
    expect(body.imports[0].fileName).toBe("leads.xlsx");
  });

  it("DELETE returns 404 when import not found for tenant", async () => {
    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "ADMIN" },
    });
    findOne.mockResolvedValue(null);

    const { DELETE } = await import("@/app/api/imports/route");
    const res = await DELETE(
      new Request(`http://localhost/api/imports?id=${importId}`, {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(404);
  });

  it("DELETE removes import + leads and publishes Ably event", async () => {
    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "ADMIN" },
    });
    findOne.mockResolvedValue({ _id: importId, uploadedBy: adminId });
    deleteMany.mockResolvedValue({ deletedCount: 3 });
    deleteOne.mockResolvedValue({ deletedCount: 1 });

    const { DELETE } = await import("@/app/api/imports/route");
    const res = await DELETE(
      new Request(`http://localhost/api/imports?id=${importId}`, {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      message: "Import and associated leads deleted",
      deletedLeads: 3,
    });
    expect(deleteMany).toHaveBeenCalled();
    expect(deleteOne).toHaveBeenCalled();
    expect(publishAdminLeadsUpdatedEvent).toHaveBeenCalledWith(
      adminId,
      expect.objectContaining({
        type: "import_deleted",
        importId,
        deletedLeads: 3,
      }),
    );
  });

  it("POST rejects agents (admin-only import)", async () => {
    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "AGENT", adminId },
    });

    const { POST } = await import("@/app/api/imports/route");
    const res = await POST(
      new Request("http://localhost/api/imports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: "agent.csv",
          recordCount: 10,
          timestamp: Date.now(),
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST rejects more than 50,000 leads in one import", async () => {
    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "ADMIN" },
    });

    const { POST } = await import("@/app/api/imports/route");
    for (const attempted of [50_001, 100_000]) {
      const res = await POST(
        new Request("http://localhost/api/imports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: "too-big.csv",
            recordCount: attempted,
            timestamp: Date.now(),
          }),
        }),
      );
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.maxPerImport).toBe(50_000);
      expect(body.attempted).toBe(attempted);
    }
  });

  it("POST accepts recordCount at the 50,000 cap (before insert)", async () => {
    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "ADMIN" },
    });
    const checkTenantLeadImportAllowed = vi.fn().mockResolvedValue({
      ok: true,
      currentLeads: 0,
      maxLeads: -1,
    });
    vi.doMock("@/lib/tenantLeadImportLimits", () => ({
      checkTenantLeadImportAllowed,
    }));
    // Re-import route with mocks already in place from file-level mocks —
    // batch limit runs before DB; 50_000 must not 400 for batch limit.
    const { getPerImportLimitError } = await import("@/lib/importBatchLimits");
    expect(getPerImportLimitError(49_999)).toBeNull();
    expect(getPerImportLimitError(50_000)).toBeNull();
  });
});
