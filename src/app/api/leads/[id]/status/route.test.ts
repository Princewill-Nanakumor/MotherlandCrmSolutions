import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

const getServerSession = vi.fn();
const connectMongoDB = vi.fn().mockResolvedValue(undefined);
const publishLeadUpdatedEvent = vi.fn().mockResolvedValue(undefined);
const publishAdminLeadsUpdatedEvent = vi.fn().mockResolvedValue(undefined);

vi.mock("next-auth", () => ({
  getServerSession: (...args: unknown[]) => getServerSession(...args),
}));

vi.mock("@/libs/auth", () => ({
  authOptions: {},
}));

vi.mock("@/libs/dbConfig", () => ({
  connectMongoDB: (...args: unknown[]) => connectMongoDB(...args),
}));

vi.mock("@/libs/ablyServer", () => ({
  publishLeadUpdatedEvent: (...args: unknown[]) =>
    publishLeadUpdatedEvent(...args),
  publishAdminLeadsUpdatedEvent: (...args: unknown[]) =>
    publishAdminLeadsUpdatedEvent(...args),
}));

describe("PATCH /api/leads/[id]/status", () => {
  beforeEach(() => {
    getServerSession.mockReset();
    connectMongoDB.mockClear();
    publishLeadUpdatedEvent.mockClear();
    publishAdminLeadsUpdatedEvent.mockClear();
  });

  it("returns 401 when unauthenticated", async () => {
    getServerSession.mockResolvedValue(null);
    const { PATCH } = await import("./route");

    const leadId = new mongoose.Types.ObjectId().toString();
    const req = new NextRequest(
      `http://localhost/api/leads/${leadId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "CONTACTED" }),
      },
    );

    const res = await PATCH(req);
    expect(res.status).toBe(401);
    expect(connectMongoDB).not.toHaveBeenCalled();
  });

  it("returns 400 when status is missing", async () => {
    getServerSession.mockResolvedValue({
      user: { id: new mongoose.Types.ObjectId().toString(), role: "ADMIN" },
    });
    const { PATCH } = await import("./route");

    const leadId = new mongoose.Types.ObjectId().toString();
    const req = new NextRequest(
      `http://localhost/api/leads/${leadId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({}),
      },
    );

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Status is required" });
  });

  it("returns 400 for invalid lead id", async () => {
    getServerSession.mockResolvedValue({
      user: { id: new mongoose.Types.ObjectId().toString(), role: "ADMIN" },
    });
    const { PATCH } = await import("./route");

    const req = new NextRequest("http://localhost/api/leads/not-valid/status", {
      method: "PATCH",
      body: JSON.stringify({ status: "CONTACTED" }),
    });

    const res = await PATCH(req);
    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "Invalid lead ID" });
  });

  it("returns 403 when agent has no adminId", async () => {
    getServerSession.mockResolvedValue({
      user: { id: new mongoose.Types.ObjectId().toString(), role: "AGENT" },
    });
    const { PATCH } = await import("./route");

    const leadId = new mongoose.Types.ObjectId().toString();
    const req = new NextRequest(
      `http://localhost/api/leads/${leadId}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status: "CONTACTED" }),
      },
    );

    const res = await PATCH(req);
    expect(res.status).toBe(403);
  });
});
