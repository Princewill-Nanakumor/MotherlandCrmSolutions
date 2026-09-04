import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const getServerSession = vi.fn();
const publishAdminLeadsUpdatedEvent = vi.fn().mockResolvedValue(undefined);
const publishLeadUpdatedEvent = vi.fn().mockResolvedValue(undefined);

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
  publishLeadUpdatedEvent: (...args: unknown[]) =>
    publishLeadUpdatedEvent(...args),
}));

const adminId = new mongoose.Types.ObjectId();
const agentId = new mongoose.Types.ObjectId();
const actorId = adminId;

vi.mock("@/lib/roles", () => ({
  canAssignLeads: () => true,
  getTenantAdminId: () => adminId.toString(),
  isAssignableTeamRole: () => true,
}));

type LeadRow = {
  _id: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  assignedTo: {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
  } | null;
};

function buildLeads(
  total: number,
  preAssignedToTarget: number,
  options?: { reassignedFromOther?: number },
): LeadRow[] {
  const otherAgentId = new mongoose.Types.ObjectId();
  const reassignedFromOther = options?.reassignedFromOther ?? 0;
  return Array.from({ length: total }, (_, index) => {
    let assignedTo: LeadRow["assignedTo"] = null;
    if (index < preAssignedToTarget) {
      assignedTo = {
        _id: agentId,
        firstName: "E2E",
        lastName: "Agent",
      };
    } else if (index < preAssignedToTarget + reassignedFromOther) {
      assignedTo = {
        _id: otherAgentId,
        firstName: "Other",
        lastName: "Agent",
      };
    }
    return {
      _id: new mongoose.Types.ObjectId(),
      adminId,
      assignedTo,
    };
  });
}

function createMockDb(leads: LeadRow[], agentAssignedCount = 0) {
  let updateManyFilter: Record<string, unknown> | null = null;
  let insertedActivities: Record<string, unknown>[] = [];

  const leadsCollection = {
    find: (filter: Record<string, unknown>) => ({
      toArray: async () =>
        leads.filter((lead) => {
          const ids = (filter._id as { $in?: mongoose.Types.ObjectId[] })?.$in;
          if (!ids) return false;
          return (
            ids.some((id) => id.equals(lead._id)) &&
            lead.adminId.equals(filter.adminId as mongoose.Types.ObjectId)
          );
        }),
    }),
    updateMany: async (filter: Record<string, unknown>) => {
      updateManyFilter = filter;
      const ids = (filter._id as { $in?: mongoose.Types.ObjectId[] })?.$in ?? [];
      const matched = leads.filter((lead) =>
        ids.some((id) => id.equals(lead._id)),
      );
      return { matchedCount: matched.length, modifiedCount: matched.length };
    },
    countDocuments: async () => agentAssignedCount,
  };

  const usersCollection = {
    findOne: async (filter: Record<string, unknown>) => {
      const id = filter._id as mongoose.Types.ObjectId;
      if (id.equals(agentId)) {
        return {
          _id: agentId,
          firstName: "E2E",
          lastName: "Agent",
          role: "AGENT",
        };
      }
      if (id.equals(actorId)) {
        return {
          _id: actorId,
          firstName: "E2E",
          lastName: "Admin",
        };
      }
      return null;
    },
  };

  const activitiesCollection = {
    insertMany: async (docs: Record<string, unknown>[]) => {
      insertedActivities = insertedActivities.concat(docs);
      return { insertedCount: docs.length };
    },
  };

  return {
    db: {
      collection: (name: string) => {
        if (name === "leads") return leadsCollection;
        if (name === "users") return usersCollection;
        if (name === "activities") return activitiesCollection;
        throw new Error(`Unexpected collection ${name}`);
      },
    },
    getUpdateManyFilter: () => updateManyFilter,
    getInsertedActivities: () => insertedActivities,
  };
}

describe("POST /api/leads/assign bulk correctness", () => {
  beforeEach(() => {
    vi.resetModules();
    getServerSession.mockReset();
    publishAdminLeadsUpdatedEvent.mockClear();
    publishLeadUpdatedEvent.mockClear();

    getServerSession.mockResolvedValue({
      user: {
        id: actorId.toString(),
        role: "ADMIN",
        firstName: "E2E",
        lastName: "Admin",
      },
    });
  });

  it("500 selected with 50 already on target agent → 450 updates, 450 activities, 1 Ably admin event", async () => {
    const leads = buildLeads(500, 50);
    const leadIds = leads.map((lead) => lead._id.toString());
    const mock = createMockDb(leads);

    Object.defineProperty(mongoose.connection, "db", {
      configurable: true,
      value: mock.db,
    });

    const { POST } = await import("@/app/api/leads/assign/route");
    const res = await POST(
      new Request("http://localhost/api/leads/assign", {
        method: "POST",
        body: JSON.stringify({ leadIds, userId: agentId.toString() }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      modifiedCount?: number;
      success?: boolean;
    };
    expect(body.success).toBe(true);
    expect(body.modifiedCount).toBe(450);

    const updateIds =
      (mock.getUpdateManyFilter()?._id as { $in?: mongoose.Types.ObjectId[] })
        ?.$in ?? [];
    expect(updateIds).toHaveLength(450);

    expect(mock.getInsertedActivities()).toHaveLength(450);
    expect(publishAdminLeadsUpdatedEvent).toHaveBeenCalledTimes(1);
    expect(publishLeadUpdatedEvent).not.toHaveBeenCalled();

    const ablyPayload = publishAdminLeadsUpdatedEvent.mock.calls[0]?.[1] as {
      leadIds?: string[];
    };
    expect(ablyPayload.leadIds).toHaveLength(450);
  });

  it("rejects reassignment when it would push the agent over the 500 cap", async () => {
    // 10 leads currently on another agent; target already at 495 → would become 505
    const leads = buildLeads(10, 0, { reassignedFromOther: 10 });
    const leadIds = leads.map((lead) => lead._id.toString());
    const mock = createMockDb(leads, 495);

    Object.defineProperty(mongoose.connection, "db", {
      configurable: true,
      value: mock.db,
    });

    const { POST } = await import("@/app/api/leads/assign/route");
    const res = await POST(
      new Request("http://localhost/api/leads/assign", {
        method: "POST",
        body: JSON.stringify({ leadIds, userId: agentId.toString() }),
      }),
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { success?: boolean; message?: string };
    expect(body.success).toBe(false);
    expect(body.message).toMatch(/already have 495 assigned leads/);
    expect(mock.getUpdateManyFilter()).toBeNull();
  });
});
