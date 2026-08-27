import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import mongoose from "mongoose";

const getServerSession = vi.fn();
const publishAdminLeadsUpdatedEvent = vi.fn().mockResolvedValue(undefined);

const statusFindOne = vi.fn();
const statusFindOneAndDelete = vi.fn();

const leadsFindToArray = vi.fn();
const leadsUpdateMany = vi.fn();
const activitiesInsertMany = vi.fn();
const statusesDeleteOne = vi.fn();

const collection = vi.fn((name: string) => {
  if (name === "leads") {
    return {
      find: () => ({ toArray: leadsFindToArray }),
      updateMany: leadsUpdateMany,
    };
  }
  if (name === "activities") {
    return { insertMany: activitiesInsertMany };
  }
  if (name === "statuses") {
    return { deleteOne: statusesDeleteOne };
  }
  return {};
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

vi.mock("@/libs/ablyServer", () => ({
  publishAdminLeadsUpdatedEvent: (...args: unknown[]) =>
    publishAdminLeadsUpdatedEvent(...args),
}));

vi.mock("@/models/Status", () => ({
  default: {
    findOne: (...args: unknown[]) => statusFindOne(...args),
    findOneAndDelete: (...args: unknown[]) => statusFindOneAndDelete(...args),
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

describe("DELETE /api/statuses/[id]", () => {
  const adminId = new mongoose.Types.ObjectId();
  const statusId = new mongoose.Types.ObjectId();
  const leadId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    getServerSession.mockReset();
    publishAdminLeadsUpdatedEvent.mockClear();
    statusFindOne.mockReset();
    statusFindOneAndDelete.mockReset();
    leadsFindToArray.mockReset();
    leadsUpdateMany.mockReset();
    activitiesInsertMany.mockReset();
    statusesDeleteOne.mockReset();
    collection.mockClear();

    getServerSession.mockResolvedValue({
      user: {
        id: adminId.toString(),
        role: "ADMIN",
        firstName: "Ada",
        lastName: "Admin",
      },
    });
  });

  it("returns 401 when unauthenticated", async () => {
    getServerSession.mockResolvedValue(null);
    const { DELETE } = await import("@/app/api/statuses/[id]/route");
    const res = await DELETE(
      new NextRequest(`http://localhost/api/statuses/${statusId.toString()}`, {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for agents", async () => {
    getServerSession.mockResolvedValue({
      user: {
        id: new mongoose.Types.ObjectId().toString(),
        role: "AGENT",
        adminId: adminId.toString(),
      },
    });
    const { DELETE } = await import("@/app/api/statuses/[id]/route");
    const res = await DELETE(
      new NextRequest(`http://localhost/api/statuses/${statusId.toString()}`, {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when deleting synthetic NEW", async () => {
    const { DELETE } = await import("@/app/api/statuses/[id]/route");
    const res = await DELETE(
      new NextRequest("http://localhost/api/statuses/NEW", {
        method: "DELETE",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("resets matching leads to NEW and writes timeline activities", async () => {
    statusFindOne.mockResolvedValue({
      _id: statusId,
      name: "Callback",
      adminId,
    });
    statusFindOneAndDelete.mockResolvedValue({
      _id: statusId,
      name: "Callback",
      adminId,
    });
    leadsFindToArray.mockResolvedValue([{ _id: leadId }]);
    leadsUpdateMany.mockResolvedValue({ modifiedCount: 1 });
    activitiesInsertMany.mockResolvedValue({ insertedCount: 1 });
    statusesDeleteOne.mockResolvedValue({ deletedCount: 0 });

    const { DELETE } = await import("@/app/api/statuses/[id]/route");
    const res = await DELETE(
      new NextRequest(`http://localhost/api/statuses/${statusId.toString()}`, {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reassignedLeads).toBe(1);
    expect(body.leadIds).toEqual([leadId.toString()]);

    expect(leadsUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: expect.arrayContaining([
          { status: statusId.toString() },
          { status: "Callback" },
        ]),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ status: "NEW" }),
      }),
    );

    expect(activitiesInsertMany).toHaveBeenCalledTimes(1);
    const docs = activitiesInsertMany.mock.calls[0][0] as Array<{
      type: string;
      leadId: mongoose.Types.ObjectId;
      details: string;
      metadata: Record<string, unknown>;
    }>;
    expect(docs).toHaveLength(1);
    expect(docs[0].type).toBe("STATUS_CHANGE");
    expect(docs[0].leadId.toString()).toBe(leadId.toString());
    expect(docs[0].details).toContain("previous status deleted");
    expect(docs[0].metadata).toMatchObject({
      reason: "status_deleted",
      previousStatusDeleted: true,
      oldStatus: "Callback",
      newStatus: "New",
      newStatusId: "NEW",
    });

    expect(publishAdminLeadsUpdatedEvent).toHaveBeenCalledWith(
      adminId.toString(),
      expect.objectContaining({
        type: "status_changed",
        status: "NEW",
        leadId: leadId.toString(),
        leadIds: [leadId.toString()],
      }),
    );
  });

  it("skips activity insert when no leads used the status", async () => {
    statusFindOne.mockResolvedValue({
      _id: statusId,
      name: "Warm",
      adminId,
    });
    statusFindOneAndDelete.mockResolvedValue({
      _id: statusId,
      name: "Warm",
      adminId,
    });
    leadsFindToArray.mockResolvedValue([]);
    leadsUpdateMany.mockResolvedValue({ modifiedCount: 0 });
    statusesDeleteOne.mockResolvedValue({ deletedCount: 0 });

    const { DELETE } = await import("@/app/api/statuses/[id]/route");
    const res = await DELETE(
      new NextRequest(`http://localhost/api/statuses/${statusId.toString()}`, {
        method: "DELETE",
      }),
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.reassignedLeads).toBe(0);
    expect(body.leadIds).toEqual([]);
    expect(activitiesInsertMany).not.toHaveBeenCalled();
  });
});
