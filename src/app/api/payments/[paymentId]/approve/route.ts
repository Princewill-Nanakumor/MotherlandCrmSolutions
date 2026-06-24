import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";
import { Types } from "mongoose";
import mongoose from "mongoose";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { enrichPaymentForResponse } from "@/lib/paymentPresentation";

interface PaymentDocument {
  _id: Types.ObjectId;
  amount: number;
  currency: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  method: "CREDIT_CARD" | "PAYPAL" | "BANK_TRANSFER" | "CRYPTO";
  transactionId: string;
  description?: string;
  network?: "TRC20" | "ERC20";
  walletAddress?: string;
  createdAt: string;
  approvedAt?: string;
  createdBy?: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  adminId?: Types.ObjectId;
}

interface UserDocument {
  _id: Types.ObjectId;
  email: string;
  role: string;
  name?: string;
  balance?: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  let txnSession: mongoose.ClientSession | null = null;
  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorizedResponse();
    }

    // Await the params to get the paymentId
    const { paymentId } = await params;

    // Validate paymentId format
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json(
        { error: "Invalid payment ID" },
        { status: 400 }
      );
    }

    // Get user info to check if they're a super admin
    const user = (await User.findOne({
      email: session.user.email,
    }).lean()) as UserDocument | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user is super admin
    const superAdminEmails =
      process.env.SUPER_ADMIN_EMAILS?.split(",").map((email) => email.trim()) ||
      [];

    const isSuperAdmin =
      user.role === "ADMIN" && superAdminEmails.includes(user.email);

    if (!isSuperAdmin) {
      return forbiddenResponse(
        "Super admin access required to approve payments",
        "INSUFFICIENT_PERMISSIONS",
      );
    }

    txnSession = await mongoose.startSession();
    let updatedPayment: PaymentDocument | null = null;
    let updatedAdmin: UserDocument | null = null;
    let previousStatus: PaymentDocument["status"] | null = null;

    await txnSession.withTransaction(async () => {
      const payment = (await Payment.findById(paymentId)
        .session(txnSession)
        .lean()) as PaymentDocument | null;

      if (!payment) {
        throw new Error("PAYMENT_NOT_FOUND");
      }

      previousStatus = payment.status;
      if (payment.status !== "PENDING") {
        return;
      }

      const admin = (await User.findById(payment.adminId)
        .session(txnSession)
        .lean()) as UserDocument | null;

      if (!admin) {
        throw new Error("ADMIN_NOT_FOUND");
      }

      updatedPayment = (await Payment.findOneAndUpdate(
        { _id: paymentId, status: "PENDING" },
        {
          status: "COMPLETED",
          approvedAt: new Date(),
          approvedBy: user._id,
        },
        { new: true, runValidators: true, session: txnSession },
      ).lean()) as PaymentDocument | null;

      if (!updatedPayment) {
        return;
      }

      updatedAdmin = (await User.findByIdAndUpdate(
        payment.adminId,
        { $inc: { balance: payment.amount } },
        { new: true, runValidators: true, session: txnSession },
      ).lean()) as UserDocument | null;

      if (!updatedAdmin) {
        throw new Error("ADMIN_BALANCE_UPDATE_FAILED");
      }
    });

    if (previousStatus === null) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Idempotency guard: repeated approval does not double-credit.
    if (!updatedPayment || !updatedAdmin) {
      return NextResponse.json(
        { error: "Payment already processed", code: "ALREADY_PROCESSED" },
        { status: 409 },
      );
    }
    const approvedPayment = updatedPayment as PaymentDocument;
    const creditedAdmin = updatedAdmin as UserDocument;

    // Create notification for the admin who made the payment (with deduplication)
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const dedupKey = `payment_approved_${paymentId}`;
    const notificationsCol = mongoose.connection.db.collection("notifications");
    const now = new Date();

    const notificationDoc = {
      type: "PAYMENT_APPROVED",
      message: `Your payment of ${approvedPayment.amount} ${approvedPayment.currency} has been approved successfully`,
      role: "ADMIN",
      link: `/dashboard/payment-details/${paymentId}`, // Fixed link to match your routes
      paymentId: paymentId,
      amount: approvedPayment.amount,
      currency: approvedPayment.currency,
      userId: approvedPayment.adminId?.toString(),
      createdAt: now.toISOString(),
      read: false,
      timestamp: now.getTime(),
      deduplicationKey: dedupKey,
    };

    // Use atomic upsert to prevent duplicates
    await notificationsCol.updateOne(
      { deduplicationKey: dedupKey },
      { $setOnInsert: notificationDoc },
      { upsert: true }
    );

    const paymentResponse = await enrichPaymentForResponse(approvedPayment);

    return NextResponse.json({
      success: true,
      payment: paymentResponse,
      message: `Payment approved successfully. Admin balance updated to ${creditedAdmin.balance}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "PAYMENT_NOT_FOUND") {
        return NextResponse.json({ error: "Payment not found" }, { status: 404 });
      }
      if (error.message === "ADMIN_NOT_FOUND") {
        return NextResponse.json({ error: "Admin not found" }, { status: 404 });
      }
    }
    console.error("Error approving payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    if (txnSession) {
      await txnSession.endSession();
    }
  }
}
