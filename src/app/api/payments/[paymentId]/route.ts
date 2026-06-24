// /Users/safeconnection/Downloads/drivecrm/src/app/api/payments/[paymentId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";
import { Types } from "mongoose";
import mongoose from "mongoose";
import type { Session } from "next-auth";
import { canManagePayments, canReadPayment } from "@/lib/paymentAccess";
import { forbiddenResponse } from "@/lib/apiResponses";
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params to get the paymentId
    const { paymentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    // Find the payment
    const payment = (await Payment.findById(
      paymentId
    ).lean()) as PaymentDocument | null;

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (!canReadPayment(session as Session, payment)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const paymentResponse = await enrichPaymentForResponse(payment);

    return NextResponse.json({
      success: true,
      payment: paymentResponse,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  let txnSession: mongoose.ClientSession | null = null;
  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params to get the paymentId
    const { paymentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    // Allowlist: super admins may only edit non-financial annotations through
    // PUT. Status / amount / balance changes go through dedicated routes
    // (`/approve`, `/reject`, `/verify`) so the audit trail and balance
    // crediting cannot be bypassed via mass-assignment.
    const ALLOWED_PUT_FIELDS = ["description", "notes"] as const;
    const update: Record<string, unknown> = {};
    for (const key of ALLOWED_PUT_FIELDS) {
      if (key in body) {
        update[key] = body[key];
      }
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No editable fields provided" },
        { status: 400 },
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
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    txnSession = await mongoose.startSession();
    let updatedPaymentId: string | null = null;

    await txnSession.withTransaction(async () => {
      const updatedPayment = (await Payment.findByIdAndUpdate(
        paymentId,
        { $set: update },
        { new: true, runValidators: true, session: txnSession! }
      ).lean()) as PaymentDocument | null;
      if (updatedPayment) {
        updatedPaymentId = String(updatedPayment._id);
      }
    });

    if (!updatedPaymentId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const updatedPayment = (await Payment.findById(updatedPaymentId).lean()) as
      | PaymentDocument
      | null;
    if (!updatedPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Convert MongoDB ObjectId to string for JSON response
    const paymentResponse = {
      ...updatedPayment,
      _id: String(updatedPayment._id),
      createdBy: updatedPayment.createdBy
        ? String(updatedPayment.createdBy)
        : undefined,
      approvedBy: updatedPayment.approvedBy
        ? String(updatedPayment.approvedBy)
        : undefined,
      adminId: updatedPayment.adminId
        ? String(updatedPayment.adminId)
        : undefined,
    };

    return NextResponse.json({
      success: true,
      payment: paymentResponse,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  let txnSession: mongoose.ClientSession | null = null;
  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Await the params to get the paymentId
    const { paymentId } = await params;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return NextResponse.json({ error: "Invalid payment ID" }, { status: 400 });
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
      return NextResponse.json(
        { error: "Super admin access required" },
        { status: 403 }
      );
    }

    txnSession = await mongoose.startSession();
    let deletedPayment: PaymentDocument | null = null;
    await txnSession.withTransaction(async () => {
      deletedPayment = (await Payment.findByIdAndDelete(paymentId, {
        session: txnSession!,
      }).lean()) as PaymentDocument | null;
    });

    if (!deletedPayment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
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
