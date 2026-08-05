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
    const { GET } = await import("./route");
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

    const { GET } = await import("./route");
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

    const { DELETE } = await import("./route");
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

    const { DELETE } = await import("./route");
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
});
