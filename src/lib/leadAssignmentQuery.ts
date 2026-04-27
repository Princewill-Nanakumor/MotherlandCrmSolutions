import mongoose from "mongoose";

/**
 * Matches leads assigned to the given user across storage shapes:
 * ObjectId, string id, or populated `{ _id, ... }` from assign APIs.
 */
export function agentAssignedToUserClause(agentUserId: string) {
  const oid = new mongoose.Types.ObjectId(agentUserId);
  return {
    $or: [
      { "assignedTo._id": oid },
      { assignedTo: oid },
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
