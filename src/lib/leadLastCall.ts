/**
 * Structural Db so callers can pass either top-level `mongodb.Db` or
 * mongoose's nested driver `Db` without dual-package assignability errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoDb = { collection: (name: string) => any };

type ObjectIdLike = { toString(): string };

const backfilledTenantIds = new Set<string>();

/**
 * One-shot per process/tenant: copy latest CALL_INITIATED activity onto leads
 * so `lastCallInitiatedAt` can be sorted/paginated with an index.
 */
export async function ensureTenantLastCallBackfill(
  db: MongoDb,
  adminId: ObjectIdLike,
): Promise<void> {
  const key = adminId.toString();
  if (backfilledTenantIds.has(key)) return;

  type Row = { _id: ObjectIdLike; createdAt: Date };
  const latestByLead = await db
    .collection("activities")
    .aggregate([
      {
        $match: {
          type: "CALL_INITIATED",
          $or: [{ adminId }, { adminId: { $exists: false } }],
        },
      },
      { $sort: { timestamp: -1, createdAt: -1 } },
      {
        $group: {
          _id: "$leadId",
          createdAt: {
            $first: { $ifNull: ["$timestamp", "$createdAt"] },
          },
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
              lastCallInitiatedAt:
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
