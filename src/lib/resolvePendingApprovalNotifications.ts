import mongoose from "mongoose";
import type {
  AnyBulkWriteOperation,
  Document,
  ObjectId,
  WithId,
} from "mongodb";

export type PendingResolvedStatus = "APPROVED" | "REJECTED";

/** Match paymentId whether stored as string or ObjectId. */
export function paymentIdNotificationSelectors(
  paymentId: string,
): Record<string, unknown>[] {
  const selectors: Record<string, unknown>[] = [{ paymentId: String(paymentId) }];
  if (mongoose.Types.ObjectId.isValid(paymentId)) {
    selectors.push({ paymentId: new mongoose.Types.ObjectId(paymentId) });
  }
  return selectors;
}

export function pendingApprovalResolutionFields(
  status: PendingResolvedStatus,
  amount?: number,
  currency?: string,
  now: Date = new Date(),
): Record<string, unknown> {
  const amountLabel =
    amount != null
      ? `${amount} ${currency || "USDT"}`
      : "the payment";

  if (status === "APPROVED") {
    return {
      type: "PAYMENT_APPROVED",
      message: `Payment of ${amountLabel} was approved`,
      read: true,
      resolvedAt: now.toISOString(),
      resolvedStatus: "APPROVED",
    };
  }

  return {
    type: "PAYMENT_REJECTED",
    message: `Payment of ${amountLabel} was rejected`,
    read: true,
    resolvedAt: now.toISOString(),
    resolvedStatus: "REJECTED",
  };
}

/**
 * Mark super-admin "pending approval" alerts for a payment as approved/rejected.
 * Updates type + message so the notifications page no longer shows PENDING.
 */
export async function resolvePendingApprovalNotifications(options: {
  paymentId: string;
  status: PendingResolvedStatus;
  amount?: number;
  currency?: string;
}): Promise<number> {
  if (!mongoose.connection.db) return 0;

  const now = new Date();
  const result = await mongoose.connection.db
    .collection("notifications")
    .updateMany(
      {
        type: "PAYMENT_PENDING_APPROVAL",
        $or: paymentIdNotificationSelectors(options.paymentId),
      },
      {
        $set: pendingApprovalResolutionFields(
          options.status,
          options.amount,
          options.currency,
          now,
        ),
      },
    );

  return result.modifiedCount;
}

export type PendingNote = {
  _id: ObjectId;
  paymentId?: unknown;
  amount?: unknown;
  currency?: unknown;
};

export type PaymentLean = {
  _id: ObjectId;
  status?: unknown;
  amount?: unknown;
  currency?: unknown;
};

/**
 * Build bulkWrite ops for pending-approval notifications whose payments are
 * already COMPLETED/FAILED. Pure helper for tests + batched reconcile.
 */
export function buildStalePendingApprovalBulkOps(
  pending: PendingNote[],
  payments: PaymentLean[],
  now: Date = new Date(),
): AnyBulkWriteOperation<Document>[] {
  const paymentMap = new Map(
    payments.map((payment) => [String(payment._id), payment]),
  );

  const ops: AnyBulkWriteOperation<Document>[] = [];

  for (const note of pending) {
    if (note.paymentId == null) continue;
    const paymentId = String(note.paymentId);
    if (!mongoose.Types.ObjectId.isValid(paymentId)) continue;

    const payment = paymentMap.get(paymentId);
    if (!payment) continue;

    const status = String(payment.status || "");
    if (status !== "COMPLETED" && status !== "FAILED") continue;

    const resolved: PendingResolvedStatus =
      status === "COMPLETED" ? "APPROVED" : "REJECTED";

    ops.push({
      updateOne: {
        filter: { _id: note._id, type: "PAYMENT_PENDING_APPROVAL" },
        update: {
          $set: pendingApprovalResolutionFields(
            resolved,
            typeof payment.amount === "number"
              ? payment.amount
              : typeof note.amount === "number"
                ? note.amount
                : undefined,
            typeof payment.currency === "string"
              ? payment.currency
              : typeof note.currency === "string"
                ? note.currency
                : undefined,
            now,
          ),
        },
      },
    });
  }

  return ops;
}

/**
 * Safety-net cleanup for pending-approval rows whose payments already
 * completed/failed (e.g. historical drift). Prefer event-driven
 * resolvePendingApprovalNotifications on approve/reject; call this from a
 * low-frequency cron — not from notification read paths.
 */
export async function reconcileStalePendingApprovalNotifications(): Promise<number> {
  if (!mongoose.connection.db) return 0;

  const notificationsCol = mongoose.connection.db.collection("notifications");
  const paymentsCol = mongoose.connection.db.collection("payments");

  const pending = (await notificationsCol
    .find({ type: "PAYMENT_PENDING_APPROVAL" })
    .project({ _id: 1, paymentId: 1, amount: 1, currency: 1 })
    .limit(200)
    .toArray()) as WithId<PendingNote>[];

  if (pending.length === 0) return 0;

  const paymentObjectIds: mongoose.Types.ObjectId[] = [];
  const seen = new Set<string>();
  for (const note of pending) {
    if (note.paymentId == null) continue;
    const paymentId = String(note.paymentId);
    if (!mongoose.Types.ObjectId.isValid(paymentId) || seen.has(paymentId)) {
      continue;
    }
    seen.add(paymentId);
    paymentObjectIds.push(new mongoose.Types.ObjectId(paymentId));
  }

  if (paymentObjectIds.length === 0) return 0;

  const payments = (await paymentsCol
    .find(
      { _id: { $in: paymentObjectIds } },
      { projection: { status: 1, amount: 1, currency: 1 } },
    )
    .toArray()) as WithId<PaymentLean>[];

  const ops = buildStalePendingApprovalBulkOps(pending, payments);
  if (ops.length === 0) return 0;

  const result = await notificationsCol.bulkWrite(ops, { ordered: false });
  return result.modifiedCount;
}
