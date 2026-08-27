import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const getServerSession = vi.fn();
const getAdminScopeId = vi.fn();

const statusFindToArray = vi.fn();
const leadsAggregateToArray = vi.fn();

const collection = vi.fn((name: string) => {
  if (name === "status" || name === "statuses") {
    return {
      find: () => ({ toArray: statusFindToArray }),
    };
  }
  if (name === "leads") {
    return {
      aggregate: () => ({ toArray: leadsAggregateToArray }),
    };
  }
  return {
    find: () => ({ toArray: vi.fn().mockResolvedValue([]) }),
    aggregate: () => ({ toArray: vi.fn().mockResolvedValue([]) }),
  };
});

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("@/libs/auth", () => ({
  authOptions: {},
}));

vi.mock("@/libs/dbConfig", () => ({
  connectMongoDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/withAdminScope", () => ({
  getAdminScopeId: (...args: unknown[]) => getAdminScopeId(...args),
}));

vi.mock("@/models/Status", () => ({
  default: {
    collection: { name: "status" },
  },
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

describe("GET /api/leads/status-counts", () => {
  const adminId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    getServerSession.mockReset();
    getAdminScopeId.mockReset();
    statusFindToArray.mockReset();
    leadsAggregateToArray.mockReset();
    collection.mockClear();

    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "ADMIN" },
    });
    getAdminScopeId.mockReturnValue(adminId);
  });

  it("returns 401 when unauthenticated", async () => {
    getServerSession.mockResolvedValue(null);
    const { GET } = await import("@/app/api/leads/status-counts/route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("empty tenant with no statuses and no leads → 0 status rows", async () => {
    statusFindToArray.mockResolvedValue([]);
    leadsAggregateToArray.mockResolvedValue([]);

    const { GET } = await import("@/app/api/leads/status-counts/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.statusCounts).toEqual([]);
    expect(body.totalStatuses).toBe(0);
    expect(body.totalLeads).toBe(0);
    expect(body.unresolvedCount).toBe(0);
  });

  it("imported NEW leads without custom statuses → New row with count", async () => {
    statusFindToArray.mockResolvedValue([]);
    leadsAggregateToArray.mockResolvedValue([{ _id: "NEW", count: 5 }]);

    const { GET } = await import("@/app/api/leads/status-counts/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.totalLeads).toBe(5);
    expect(body.unresolvedCount).toBe(0);
    expect(body.statusCounts).toHaveLength(1);
    expect(body.statusCounts[0]).toMatchObject({
      id: "NEW",
      name: "New",
      count: 5,
    });
    expect(body.totalStatuses).toBe(1);
  });

  it("blank status values count toward New", async () => {
    statusFindToArray.mockResolvedValue([]);
    leadsAggregateToArray.mockResolvedValue([{ _id: "", count: 2 }]);

    const { GET } = await import("@/app/api/leads/status-counts/route");
    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.statusCounts[0]).toMatchObject({
      name: "New",
      count: 2,
    });
  });
});
