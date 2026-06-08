import mongoose from "mongoose";

/** Agent leads page loads all assigned rows client-side — cap per assignee. */
export const MAX_ASSIGNED_LEADS_PER_AGENT = 500;

/**
 * Matches leads assigned to the given user across storage shapes:
 * ObjectId, string id, or populated `{ _id, ... }` from assign APIs.
 */
export function agentAssignedToUserClause(agentUserId: string) {
  const hasValidObjectId = mongoose.Types.ObjectId.isValid(agentUserId);
  const oid = hasValidObjectId
    ? new mongoose.Types.ObjectId(agentUserId)
    : null;
  const objectIdClauses = oid
    ? [{ "assignedTo._id": oid }, { assignedTo: oid }]
    : [];
  return {
    $or: [
      ...objectIdClauses,
      { assignedTo: agentUserId },
    ],
  };
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

/** Single-lead read/update/delete: tenant + assignment for agents. */
export function singleLeadAccessFilter(
  leadObjectId: mongoose.Types.ObjectId,
  tenantAdminId: mongoose.Types.ObjectId,
  role: string,
  sessionUserId: string,
): Record<string, unknown> {
  if (role === "AGENT") {
    return {
      $and: [
        { _id: leadObjectId, adminId: tenantAdminId },
        agentAssignedToUserClause(sessionUserId),
      ],
    };
  }
  return { _id: leadObjectId, adminId: tenantAdminId };
}

export function getLeadAssigneeId(assignedTo: unknown): string | null {
  if (!assignedTo) return null;
  if (typeof assignedTo === "string") return assignedTo;
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
