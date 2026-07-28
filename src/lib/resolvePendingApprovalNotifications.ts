import mongoose from "mongoose";

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

/**
 * For any still-pending approval notifications whose payment is already
 * COMPLETED/FAILED, rewrite them so history stays accurate.
 */
export async function reconcileStalePendingApprovalNotifications(): Promise<number> {
  if (!mongoose.connection.db) return 0;

  const notificationsCol = mongoose.connection.db.collection("notifications");
  const paymentsCol = mongoose.connection.db.collection("payments");

  const pending = await notificationsCol
    .find({ type: "PAYMENT_PENDING_APPROVAL" })
    .project({ _id: 1, paymentId: 1, amount: 1, currency: 1 })
    .limit(200)
    .toArray();

  if (pending.length === 0) return 0;

  let updated = 0;
  const now = new Date();

  for (const note of pending) {
    const paymentIdRaw = note.paymentId;
    if (paymentIdRaw == null) continue;
    const paymentId = String(paymentIdRaw);
    if (!mongoose.Types.ObjectId.isValid(paymentId)) continue;

    const payment = await paymentsCol.findOne(
      { _id: new mongoose.Types.ObjectId(paymentId) },
      { projection: { status: 1, amount: 1, currency: 1 } },
    );
    if (!payment) continue;

    const status = String(payment.status || "");
    if (status !== "COMPLETED" && status !== "FAILED") continue;

    const resolved: PendingResolvedStatus =
      status === "COMPLETED" ? "APPROVED" : "REJECTED";

    const result = await notificationsCol.updateOne(
      { _id: note._id, type: "PAYMENT_PENDING_APPROVAL" },
      {
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
    );
    if (result.modifiedCount > 0) updated += 1;
  }

  return updated;
}
