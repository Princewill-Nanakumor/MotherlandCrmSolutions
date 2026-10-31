/**
 * Structural Db so callers can pass either top-level `mongodb.Db` or
 * mongoose's nested driver `Db` without dual-package assignability errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoDb = { collection: (name: string) => any };

type ObjectIdLike = { toString(): string };

const backfilledTenantIds = new Set<string>();

type LeadLastCommentSnapshot = {
  content: string;
  createdAt: Date;
} | null;

/** Latest comment for a lead (tenant-scoped), or null if none remain. */
async function findLatestLeadComment(
  db: MongoDb,
  leadId: ObjectIdLike,
  adminId: ObjectIdLike,
): Promise<LeadLastCommentSnapshot> {
  const latest = await db.collection("comments").findOne(
    {
      leadId,
      $or: [{ adminId }, { adminId: { $exists: false } }],
    },
    {
      sort: { createdAt: -1 },
      projection: { content: 1, createdAt: 1 },
    },
  );

  if (!latest?.createdAt) return null;
  return {
    content: String(latest.content ?? ""),
    createdAt:
      latest.createdAt instanceof Date
        ? latest.createdAt
        : new Date(latest.createdAt as string | number | Date),
  };
}

/**
 * Keep denormalized `lastComment` / `lastCommentDate` on the lead in sync.
 * Also touches `lastActivityAt` / `updatedAt` so list ordering stays coherent.
 */
export async function syncLeadLastCommentFields(
  db: MongoDb,
  leadId: ObjectIdLike,
  adminId: ObjectIdLike,
  options?: { activityAt?: Date },
): Promise<LeadLastCommentSnapshot> {
  const latest = await findLatestLeadComment(db, leadId, adminId);
  const activityAt =
    options?.activityAt ?? latest?.createdAt ?? new Date();

  await db.collection("leads").updateOne(
    { _id: leadId, adminId },
    {
      $set: latest
        ? {
            lastComment: latest.content,
            lastCommentDate: latest.createdAt,
            lastActivityAt: activityAt,
            updatedAt: activityAt,
          }
        : {
            lastComment: null,
            lastCommentDate: null,
            lastActivityAt: activityAt,
            updatedAt: activityAt,
          },
    },
  );

  return latest;
}

/**
 * One-shot per process/tenant: copy latest comment onto leads so
 * `lastCommentDate` can be sorted/paginated with an index.
 */
export async function ensureTenantLastCommentBackfill(
  db: MongoDb,
  adminId: ObjectIdLike,
): Promise<void> {
  const key = adminId.toString();
  if (backfilledTenantIds.has(key)) return;

  type Row = { _id: ObjectIdLike; content: string; createdAt: Date };
  const latestByLead = await db
    .collection("comments")
    .aggregate([
      {
        $match: {
          $or: [{ adminId }, { adminId: { $exists: false } }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$leadId",
          content: { $first: "$content" },
          createdAt: { $first: "$createdAt" },
        },
      },
    ])
    .toArray();

  const chunkSize = 500;
  for (let i = 0; i < latestByLead.length; i += chunkSize) {
    const chunk = latestByLead.slice(i, i + chunkSize) as Row[];
    if (chunk.length === 0) continue;
    await db.collection("leads").bulkWrite(
      chunk.map((row) => ({
        updateOne: {
          filter: { _id: row._id, adminId },
          update: {
            $set: {
              lastComment: String(row.content ?? ""),
              lastCommentDate:
                row.createdAt instanceof Date
                  ? row.createdAt
                  : new Date(row.createdAt),
            },
          },
        },
      })),
      { ordered: false },
    );
  }

  backfilledTenantIds.add(key);
}

