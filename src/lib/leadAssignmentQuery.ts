import mongoose from "mongoose";

/** Agent assigned-lead cap (server paginates the My Leads list). */
export const MAX_ASSIGNED_LEADS_PER_AGENT = 500;

/**
 * Matches leads assigned to the given user across storage shapes:
 * ObjectId, string id, or embedded `{ _id, firstName, lastName }` from assign APIs.
 * Use with the native driver — Mongoose casts `assignedTo` as ObjectId and drops
 * nested `"assignedTo._id"` matches on those embedded documents.
 */
export function agentAssignedToUserClause(agentUserId: string) {
  const clauses: Record<string, unknown>[] = [
    { assignedTo: agentUserId },
    { "assignedTo._id": agentUserId },
    { "assignedTo.id": agentUserId },
  ];
  if (mongoose.Types.ObjectId.isValid(agentUserId)) {
    const oid = new mongoose.Types.ObjectId(agentUserId);
    clauses.push(
      { assignedTo: oid },
      { "assignedTo._id": oid },
      { "assignedTo.id": oid },
    );
  }
  return { $or: clauses };
}

/** Tenant + assignment filter for agents (use with Lead.find / countDocuments). */
export function agentLeadsInTenantFilter(
  adminId: mongoose.Types.ObjectId,
  agentUserId: string,
) {
  return {
    $and: [{ adminId }, agentAssignedToUserClause(agentUserId)],
  };
}

/** Single-lead read/update/delete: tenant + assignment for agents.
 *  Pass `canSeeAllTenantLeads` explicitly for assigners (ADMIN / SUBADMIN+ASSIGN_LEADS).
 *  Default is false so forgotten callers never grant tenant-wide access by role alone.
 */
export function singleLeadAccessFilter(
  leadObjectId: mongoose.Types.ObjectId,
  tenantAdminId: mongoose.Types.ObjectId,
  role: string,
  sessionUserId: string,
  canSeeAllTenantLeads = false,
): Record<string, unknown> {
  if (!canSeeAllTenantLeads) {
    return {
      $and: [
        { _id: leadObjectId, adminId: tenantAdminId },
        agentAssignedToUserClause(sessionUserId),
      ],
    };
  }
  return { _id: leadObjectId, adminId: tenantAdminId };
}

/**
 * Native-driver existence check so bulk-assigned leads (embedded `assignedTo`)
 * are visible the same way as GET /api/leads/[id] and the assigned list.
 */
export async function findAccessibleLead(
  leadObjectId: mongoose.Types.ObjectId,
  tenantAdminId: mongoose.Types.ObjectId,
  role: string,
  sessionUserId: string,
  canSeeAllTenantLeads = false,
): Promise<{ _id: mongoose.Types.ObjectId } | null> {
  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("Database connection not available");
  }
  const lead = await db.collection("leads").findOne(
    singleLeadAccessFilter(
      leadObjectId,
      tenantAdminId,
      role,
      sessionUserId,
      canSeeAllTenantLeads,
    ),
    { projection: { _id: 1 } },
  );
  if (!lead?._id) return null;
  return { _id: lead._id as mongoose.Types.ObjectId };
}

export function getLeadAssigneeId(assignedTo: unknown): string | null {
  if (!assignedTo) return null;
  if (typeof assignedTo === "string") return assignedTo;
  if (assignedTo instanceof mongoose.Types.ObjectId) {
    return assignedTo.toString();
  }
  if (typeof assignedTo === "object") {
    const obj = assignedTo as { _id?: unknown; id?: unknown };
    if (obj._id != null) return String(obj._id);
    if (obj.id != null) return String(obj.id);
  }
  return null;
}

type LeadsCollection = {
  countDocuments: (filter: Record<string, unknown>) => Promise<number>;
};

export async function countLeadsAssignedToAgent(
  leadsCollection: LeadsCollection,
  adminId: mongoose.Types.ObjectId,
  agentUserId: string,
): Promise<number> {
  return leadsCollection.countDocuments(
    agentLeadsInTenantFilter(adminId, agentUserId),
  );
}

export function formatAssignmentCapacityError(
  agentFirstName: string,
  agentLastName: string,
  currentCount: number,
  attemptedNetNew: number,
): string {
  const remaining = Math.max(0, MAX_ASSIGNED_LEADS_PER_AGENT - currentCount);
  return `Cannot assign ${attemptedNetNew} lead(s) to ${agentFirstName} ${agentLastName}. They already have ${currentCount} assigned leads (maximum ${MAX_ASSIGNED_LEADS_PER_AGENT}). You can assign at most ${remaining} more.`;
}

export function assertAssignmentCapacity(
  agentFirstName: string,
  agentLastName: string,
  currentCount: number,
  netNewAssignments: number,
): void {
  if (netNewAssignments <= 0) return;
  if (currentCount + netNewAssignments <= MAX_ASSIGNED_LEADS_PER_AGENT) return;
  throw new Error(
    formatAssignmentCapacityError(
      agentFirstName,
      agentLastName,
      currentCount,
      netNewAssignments,
    ),
  );
}

/**
 * Leads that are not already assigned to `targetUserId` each increase that
 * agent's assigned total (unassigned → agent and agentA → agentB both count).
 */
export function countAssignmentsTowardCapacity(
  leads: ReadonlyArray<{ assignedTo?: unknown } | Record<string, unknown>>,
  targetUserId: string,
): number {
  return leads.filter((lead) => {
    const assignedTo =
      lead && typeof lead === "object" && "assignedTo" in lead
        ? lead.assignedTo
        : undefined;
    return getLeadAssigneeId(assignedTo) !== targetUserId;
  }).length;
}
