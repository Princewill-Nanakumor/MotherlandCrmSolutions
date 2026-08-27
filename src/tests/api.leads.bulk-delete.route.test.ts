import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

const getServerSession = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("@/libs/auth", () => ({
  authOptions: {},
}));

vi.mock("@/libs/dbConfig", () => ({
  connectMongoDB: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/libs/ablyServer", () => ({
  publishAdminLeadsUpdatedEvent: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  rateLimitEnhanced: vi.fn().mockReturnValue(true),
}));

describe("POST /api/leads/bulk/delete permissions", () => {
  beforeEach(() => {
    getServerSession.mockReset();
  });

  it("anonymous → 401", async () => {
    getServerSession.mockResolvedValue(null);
    const { POST } = await import("@/app/api/leads/bulk/delete/route");
    const res = await POST(
      new NextRequest("http://localhost/api/leads/bulk/delete", {
        method: "POST",
        body: JSON.stringify({ leadIds: [new mongoose.Types.ObjectId().toString()] }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("agent → 401/unauthorized (admin-only)", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        role: "AGENT",
        adminId: new mongoose.Types.ObjectId().toString(),
      },
    });
    const { POST } = await import("@/app/api/leads/bulk/delete/route");
    const res = await POST(
      new NextRequest("http://localhost/api/leads/bulk/delete", {
        method: "POST",
        body: JSON.stringify({ leadIds: [new mongoose.Types.ObjectId().toString()] }),
      }),
    );
    expect(res.status).toBe(401);
  });

  it("sub-admin cannot bulk delete leads", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        role: "SUBADMIN",
        adminId: new mongoose.Types.ObjectId().toString(),
        permissions: ["ASSIGN_LEADS"],
      },
    });
    const { POST } = await import("@/app/api/leads/bulk/delete/route");
    const res = await POST(
      new NextRequest("http://localhost/api/leads/bulk/delete", {
        method: "POST",
        body: JSON.stringify({ leadIds: [new mongoose.Types.ObjectId().toString()] }),
      }),
    );
    expect(res.status).toBe(401);
  });
});
