import mongoose from "mongoose";

/** Align with agent assignment cap and bulk status limit. */
export const MAX_BULK_LEAD_OPS = 500;

export const ACTIVITY_INSERT_CHUNK = 250;

export async function insertActivitiesInChunks(
  db: mongoose.mongo.Db,
  activities: Record<string, unknown>[],
): Promise<void> {
  for (let i = 0; i < activities.length; i += ACTIVITY_INSERT_CHUNK) {
    await db
      .collection("activities")
      .insertMany(activities.slice(i, i + ACTIVITY_INSERT_CHUNK), {
        ordered: false,
      });
  }
}

type EmbeddedAssignee = {
  _id?: mongoose.Types.ObjectId;
  firstName?: string;
  lastName?: string;
};

/** Names from embedded `assignedTo` on the lead — avoids per-lead user lookups on unassign. */
export function getEmbeddedAssignee(
  assignedTo: unknown,
): EmbeddedAssignee | null {
  if (!assignedTo || typeof assignedTo !== "object") return null;
  const obj = assignedTo as EmbeddedAssignee & { id?: string };
  const _id =
    obj._id ??
    (obj.id && mongoose.Types.ObjectId.isValid(obj.id)
      ? new mongoose.Types.ObjectId(obj.id)
      : undefined);
  if (!_id && !obj.firstName && !obj.lastName) return null;
  return {
    _id,
    firstName: obj.firstName,
    lastName: obj.lastName,
  };
}

export function formatAssigneeName(
  assignee: EmbeddedAssignee | null,
  fallback = "Unknown User",
): string {
  if (!assignee) return fallback;
  const name = [assignee.firstName, assignee.lastName].filter(Boolean).join(" ");
  return name || fallback;
}
