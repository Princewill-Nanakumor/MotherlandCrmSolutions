import Payment from "@/models/Payment";
import {
  isPaymentConfirmWindowExpired,
  resolvePaymentExpiresAt,
} from "@/lib/paymentConfirmWindow";

type LeanPayment = {
  _id: unknown;
  status?: string;
  userConfirmedAt?: Date | string | null;
  expiresAt?: Date | string | null;
  createdAt?: Date | string | null;
  description?: string;
};

const unconfirmedFilter = {
  $or: [
    { userConfirmedAt: { $exists: false } },
    { userConfirmedAt: null },
  ],
};

/**
 * Fail a single pending crypto deposit if the confirm window passed
 * without the user clicking "I Have Made the Payment".
 */
export async function expireUnconfirmedPaymentIfNeeded(
  payment: LeanPayment,
): Promise<LeanPayment> {
  if (payment.status !== "PENDING") return payment;
  if (payment.userConfirmedAt) return payment;

  const deadline = resolvePaymentExpiresAt(payment);
  if (!deadline || !isPaymentConfirmWindowExpired(deadline)) return payment;

  const updated = await Payment.findOneAndUpdate(
    {
      $and: [
        { _id: payment._id },
        { status: "PENDING" },
        {
          $or: [
            { userConfirmedAt: { $exists: false } },
            { userConfirmedAt: null },
          ],
        },
      ],
    },
    {
      $set: {
        status: "FAILED",
        approvedAt: new Date(),
        description: payment.description
          ? `${payment.description} (expired — not confirmed within 1 hour)`
          : "Expired — deposit not confirmed within 1 hour",
      },
    },
    { new: true },
  ).lean();

  return (updated as LeanPayment | null) ?? { ...payment, status: "FAILED" };
}

/**
 * Expire all of an admin's unconfirmed pending deposits past expiresAt.
 */
export async function expireUnconfirmedPaymentsForAdmin(
  adminId: string,
): Promise<number> {
  const now = new Date();
  const result = await Payment.updateMany(
    {
      adminId,
      status: "PENDING",
      method: "CRYPTO",
      expiresAt: { $lte: now },
      ...unconfirmedFilter,
    },
    {
      $set: {
        status: "FAILED",
        approvedAt: now,
      },
    },
  );

  // Legacy rows without expiresAt: fail if createdAt is older than 1 hour
  const legacyCutoff = new Date(now.getTime() - 60 * 60 * 1000);
  const legacy = await Payment.updateMany(
    {
      adminId,
      status: "PENDING",
      method: "CRYPTO",
      expiresAt: { $exists: false },
      createdAt: { $lte: legacyCutoff },
      ...unconfirmedFilter,
    },
    {
      $set: {
        status: "FAILED",
        approvedAt: now,
      },
    },
  );

  return (result.modifiedCount ?? 0) + (legacy.modifiedCount ?? 0);
}
