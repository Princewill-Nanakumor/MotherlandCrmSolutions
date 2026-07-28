import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import Payment from "@/models/Payment";
import type { Session } from "next-auth";
import { canReadPayment } from "@/lib/paymentAccess";
import { enrichPaymentForResponse } from "@/lib/paymentPresentation";
import { expireUnconfirmedPaymentIfNeeded } from "@/lib/expireUnconfirmedPayments";

type PaymentLean = {
  _id: mongoose.Types.ObjectId | string;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  method: string;
  transactionId: string;
  description?: string;
  network?: "TRC20" | "ERC20";
  walletAddress?: string;
  createdAt: Date | string;
  expiresAt?: Date | string;
  userConfirmedAt?: Date | string | null;
  approvedAt?: Date | string;
  createdBy?: mongoose.Types.ObjectId | string;
  approvedBy?: mongoose.Types.ObjectId | string;
  adminId?: mongoose.Types.ObjectId | string;
};

/**
 * Expire an unconfirmed crypto deposit after the 1-hour confirm window.
 * Idempotent: already-failed / confirmed payments are returned as-is.
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    await connectMongoDB();

    const payment = (await Payment.findById(paymentId).lean()) as PaymentLean | null;
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (!canReadPayment(session as Session, payment)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (payment.userConfirmedAt) {
      return NextResponse.json({
        success: true,
        expired: false,
        message: "Payment already confirmed by user",
        payment: await enrichPaymentForResponse(payment),
      });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json({
        success: true,
        expired: payment.status === "FAILED",
        payment: await enrichPaymentForResponse(payment),
      });
    }

    const updated = (await expireUnconfirmedPaymentIfNeeded(
      payment,
    )) as PaymentLean;

    if (updated.status === "PENDING") {
      return NextResponse.json({
        success: true,
        expired: false,
        message: "Confirm window still active",
        payment: await enrichPaymentForResponse(updated),
      });
    }

    return NextResponse.json({
      success: true,
      expired: true,
      message: "Deposit expired — confirmation was not submitted within 1 hour",
      payment: await enrichPaymentForResponse(updated),
    });
  } catch (error) {
    console.error("Error expiring payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
