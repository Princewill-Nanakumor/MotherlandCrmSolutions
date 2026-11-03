import { runOncePerKey } from "@/lib/oncePerKey";
import {
  hasTenantDenormFlag,
  setTenantDenormFlag,
} from "@/lib/tenantDenormFlags";

/**
 * Structural Db so callers can pass either top-level `mongodb.Db` or
 * mongoose's nested driver `Db` without dual-package assignability errors.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoDb = { collection: (name: string) => any };

type ObjectIdLike = { toString(): string };

/** In-flight / completed backfills keyed by tenant adminId (per process). */
const lastCallBackfills = new Map<string, Promise<void>>();

/**
 * One-shot per tenant (durable across serverless instances): copy latest
 * CALL_INITIATED activity onto leads so `lastCallInitiatedAt` can be sorted
 * with an index. Concurrent callers share one in-flight run.
 */
export async function ensureTenantLastCallBackfill(
  db: MongoDb,
  adminId: ObjectIdLike,
): Promise<void> {
  const key = adminId.toString();
  return runOncePerKey(lastCallBackfills, key, async () => {
    if (await hasTenantDenormFlag(db, adminId, "lastCallBackfilledAt")) {
      return;
    }

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

    await setTenantDenormFlag(db, adminId, "lastCallBackfilledAt");
  });
}
