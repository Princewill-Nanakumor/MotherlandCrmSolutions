import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import Payment from "@/models/Payment";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import type { Session } from "next-auth";
import {
  canManagePayments,
  canReadPayment,
  type PaymentTenantFields,
} from "@/lib/paymentAccess";
import { forbiddenResponse } from "@/lib/apiResponses";

/** Placeholder verifier for crypto/other flows — extend with gateway checks later. */
export async function POST(
  _request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ paymentId: string }>;
  },
) {
  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentId } = await params;
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    const paymentDoc = await Payment.findById(paymentId).lean<
      PaymentTenantFields | null | undefined
    >();

    if (!paymentDoc || Array.isArray(paymentDoc)) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const payment = paymentDoc;

    const sessionTyped = session as Session;
    if (!canManagePayments(sessionTyped)) {
      return forbiddenResponse(
        "Only admins can verify payments",
        "ADMIN_REQUIRED",
      );
    }

    if (!canReadPayment(sessionTyped, payment)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      verified: false,
      message:
        "Verification queued — integrate blockchain or gateway verification here.",
      paymentId: String(payment._id),
    });
  } catch (error) {
    console.error("Payment verify route error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
