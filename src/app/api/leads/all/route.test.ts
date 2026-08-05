import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

const getServerSession = vi.fn();
const getAllLeadsForSession = vi.fn();

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("@/libs/auth", () => ({
  authOptions: {},
}));

vi.mock("@/services/leads/getAllLeadsService", () => ({
  getAllLeadsForSession: (...args: unknown[]) => getAllLeadsForSession(...args),
}));

describe("GET /api/leads/all permissions + tenancy handoff", () => {
  beforeEach(() => {
    getServerSession.mockReset();
    getAllLeadsForSession.mockReset();
  });

  it("anonymous → 401", async () => {
    getServerSession.mockResolvedValue(null);
    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/leads/all"));
    expect(res.status).toBe(401);
    expect(getAllLeadsForSession).not.toHaveBeenCalled();
  });

  it("admin → 200 and passes admin session into service", async () => {
    const adminId = new mongoose.Types.ObjectId().toString();
    getServerSession.mockResolvedValue({
      user: { id: adminId, role: "ADMIN", email: "a@x.com" },
    });
    getAllLeadsForSession.mockResolvedValue({ leads: [], total: 0 });

    const { GET } = await import("./route");
    const res = await GET(
      new NextRequest("http://localhost/api/leads/all?page=1&pageSize=15"),
    );
    expect(res.status).toBe(200);
    expect(getAllLeadsForSession).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({ id: adminId, role: "ADMIN" }),
    );
  });

  it("agent → 200 with agent session (service enforces assignment scope)", async () => {
    const agentId = new mongoose.Types.ObjectId().toString();
    const adminId = new mongoose.Types.ObjectId().toString();
    getServerSession.mockResolvedValue({
      user: { id: agentId, role: "AGENT", adminId, email: "agent@x.com" },
    });
    getAllLeadsForSession.mockResolvedValue({ leads: [], total: 0 });

    const { GET } = await import("./route");
    const res = await GET(new NextRequest("http://localhost/api/leads/all"));
    expect(res.status).toBe(200);
    expect(getAllLeadsForSession).toHaveBeenCalledWith(
      expect.any(NextRequest),
      expect.objectContaining({ id: agentId, role: "AGENT", adminId }),
    );
  });
});
