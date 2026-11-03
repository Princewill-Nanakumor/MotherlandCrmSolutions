/**
 * Durable per-tenant flags so expensive denorm backfills run once across
 * Netlify/serverless instances (in-memory Maps do not share).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MongoDb = { collection: (name: string) => any };

type ObjectIdLike = { toString(): string };

const COLLECTION = "tenant_denorm_flags";

export type TenantDenormFlagField =
  | "lastCallBackfilledAt"
  | "lastCommentBackfilledAt";

export async function hasTenantDenormFlag(
  db: MongoDb,
  adminId: ObjectIdLike,
  field: TenantDenormFlagField,
): Promise<boolean> {
  const doc = await db.collection(COLLECTION).findOne(
    { _id: adminId, [field]: { $exists: true, $ne: null } },
    { projection: { [field]: 1 } },
  );
  return Boolean(doc?.[field]);
}

export async function setTenantDenormFlag(
  db: MongoDb,
  adminId: ObjectIdLike,
  field: TenantDenormFlagField,
): Promise<void> {
  await db.collection(COLLECTION).updateOne(
    { _id: adminId },
    { $set: { [field]: new Date() } },
    { upsert: true },
  );
}
