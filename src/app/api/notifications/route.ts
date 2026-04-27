// src/app/api/notifications/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import type { Session } from "next-auth";
import { sendPaymentConfirmationEmail } from "@/lib/emailService";
import {
  isSuperAdminSession,
  notificationOwnerSelectors,
} from "@/lib/notificationQuery";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const userRole = session.user.role;
    const userId = session.user.id;

    const isSuperAdmin = isSuperAdminSession(session as Session);

    let query: Record<string, unknown> = {};

    if (isSuperAdmin) {
      query = {
        $or: [{ role: "SUPER_ADMIN" }, { role: "ADMIN", userId: userId }],
        read: false, // Only return unread notifications
      };
    } else if (userRole === "ADMIN") {
      query = {
        role: "ADMIN",
        userId: userId,
        read: false, // Only return unread notifications
      };
    } else {
      query = {
        role: { $in: ["AGENT", "USER"] },
        read: false,
        $or: notificationOwnerSelectors(session as Session),
      };
    }

    const notifications = await mongoose.connection.db
      .collection("notifications")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    return NextResponse.json(notifications);
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
function paymentActorMatchesSession(
  createdBy: unknown,
  sessionUserId: string,
): boolean {
  if (!createdBy) return false;
  if (typeof createdBy === "object" && createdBy !== null && "equals" in createdBy) {
    try {
      return (createdBy as { equals: (id: unknown) => boolean }).equals(
        new mongoose.Types.ObjectId(sessionUserId),
      );
    } catch {
      return String(createdBy) === sessionUserId;
    }
  }
  return String(createdBy) === sessionUserId;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: { paymentId?: string };
    try {
      body = (await request.json()) as { paymentId?: string };
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const paymentIdRaw = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
    if (!paymentIdRaw || !mongoose.Types.ObjectId.isValid(paymentIdRaw)) {
      return NextResponse.json(
        { error: "Missing or invalid paymentId" },
        { status: 400 },
      );
    }

    await connectMongoDB();
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const paymentsCol = mongoose.connection.db.collection("payments");
    const payment = await paymentsCol.findOne({
      _id: new mongoose.Types.ObjectId(paymentIdRaw),
    });

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (payment.status !== "PENDING") {
      return NextResponse.json(
        { error: "Only pending payments can submit this notification" },
        { status: 400 },
      );
    }

    if (!paymentActorMatchesSession(payment.createdBy, session.user.id)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const dedupKey = `payment_confirmation_${paymentIdRaw}`;
    const notificationsCol = mongoose.connection.db.collection("notifications");
    const now = new Date();

    const amount = Number(payment.amount);
    const currency = String(payment.currency ?? "USD");
    const network = (payment.network as string | undefined) || "—";
    const firstName = session.user.firstName?.trim() || "Unknown";
    const lastName = session.user.lastName?.trim() || "User";

    const doc = {
      type: "PAYMENT_PENDING_APPROVAL" as const,
      message: `New payment confirmation submitted: ${amount} ${currency} (${network}) by ${firstName} ${lastName}`,
      role: "SUPER_ADMIN" as const,
      link: `/dashboard/payment-details/${paymentIdRaw}`,
      paymentId: paymentIdRaw,
      amount,
      currency,
      userId: session.user.id,
      createdAt: now.toISOString(),
      read: false,
      timestamp: now.getTime(),
      deduplicationKey: dedupKey,
    };

    const upsertResult = await notificationsCol.updateOne(
      { deduplicationKey: dedupKey },
      { $setOnInsert: doc },
      { upsert: true },
    );

    if (upsertResult.upsertedCount > 0) {
      await sendPaymentConfirmationEmail({
        paymentId: paymentIdRaw,
        amount,
        currency,
        network: network === "—" ? "Unknown" : network,
        userFirstName: firstName,
        userLastName: lastName,
        userEmail: session.user.email || "unknown@email.com",
        transactionId: String(payment.transactionId ?? ""),
      });
    }

    const notification = await notificationsCol.findOne({
      deduplicationKey: dedupKey,
    });

    return NextResponse.json({ success: true, notification });
  } catch (error) {
    console.error("Error creating notification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
