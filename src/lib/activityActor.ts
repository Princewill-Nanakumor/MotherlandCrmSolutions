export type ActivityActor = {
  _id: string;
  firstName: string;
  lastName: string;
};

const UNKNOWN_ACTOR: ActivityActor = {
  _id: "unknown",
  firstName: "Unknown",
  lastName: "User",
};

function actorFromMetadata(
  meta:
    | {
        id?: string;
        _id?: unknown;
        firstName?: string;
        lastName?: string;
      }
    | undefined,
): ActivityActor | null {
  if (!meta?.firstName && !meta?.lastName) return null;
  const id =
    meta.id ??
    (meta._id != null ? String(meta._id) : undefined) ??
    "unknown";
  return {
    _id: id,
    firstName: meta.firstName || "Unknown",
    lastName: meta.lastName || "",
  };
}

/**
 * Map a stored activity `userId` (ObjectId or populated user) plus denormalized
 * metadata onto the timeline `createdBy` shape.
 */
export function resolveActivityCreatedBy(input: {
  userId?:
    | {
        _id?: { toString(): string } | string;
        firstName?: string;
        lastName?: string;
      }
    | { toString(): string }
    | string
    | null;
  metadata?: {
    performedBy?: {
      id?: string;
      _id?: unknown;
      firstName?: string;
      lastName?: string;
    };
    assignedBy?: {
      id?: string;
      _id?: unknown;
      firstName?: string;
      lastName?: string;
    };
  };
}): ActivityActor {
  let createdBy: ActivityActor = { ...UNKNOWN_ACTOR };
  const userId = input.userId;

  if (userId) {
    if (typeof userId === "string") {
      createdBy = { _id: userId, firstName: "Unknown", lastName: "User" };
    } else if (typeof userId === "object" && userId !== null) {
      if ("firstName" in userId || "lastName" in userId) {
        const populated = userId as {
          _id?: { toString(): string } | string;
          firstName?: string;
          lastName?: string;
        };
        createdBy = {
          _id:
            populated._id != null ? String(populated._id.toString()) : "unknown",
          firstName: populated.firstName || "Unknown",
          lastName: populated.lastName || "User",
        };
      } else {
        createdBy = {
          _id: String((userId as { toString(): string }).toString()),
          firstName: "Unknown",
          lastName: "User",
        };
      }
    }
  }

  if (createdBy.firstName === "Unknown" && createdBy.lastName === "User") {
    const fromMeta =
      actorFromMetadata(input.metadata?.performedBy) ||
      actorFromMetadata(input.metadata?.assignedBy);
    if (fromMeta) createdBy = fromMeta;
  }

  return createdBy;
}
