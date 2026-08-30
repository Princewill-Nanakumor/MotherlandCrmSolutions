// src/app/api/subscription/subscribe/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { authOptions } from "@/libs/auth";
import { rateLimitEnhanced } from "@/lib/rateLimit";
import {
  SUBSCRIPTION_PLAN_CATALOG,
  type SubscriptionPlanCatalogKey,
} from "@/lib/subscriptionPlanCatalog";

const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

function roundCents(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function POST(req: NextRequest) {
  if (!rateLimitEnhanced(req, 5, 60000, "subscription-subscribe")) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 },
    );
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      planId?: string;
      amount?: unknown;
    };
    const planId = body.planId;
    const rawAmount = body.amount;

    if (
      !planId ||
      typeof rawAmount !== "number" ||
      !Number.isFinite(rawAmount) ||
      rawAmount <= 0
    ) {
      return NextResponse.json(
        { error: "Invalid request data" },
        { status: 400 },
      );
    }

    const plan =
      SUBSCRIPTION_PLAN_CATALOG[planId as SubscriptionPlanCatalogKey];
    if (!plan) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Compare in cents to avoid float drift; client-supplied amount is rounded.
    const amount = roundCents(rawAmount);
    if (Math.round(amount * 100) !== Math.round(plan.price * 100)) {
      return NextResponse.json(
        { error: "Invalid amount for selected plan" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const sessionUser = await User.findById(session.user.id)
      .select({ role: 1 })
      .lean();
    if (!sessionUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (sessionUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only the account owner can subscribe to a plan." },
        { status: 403 },
      );
    }

    const now = new Date();
    const newEndDate = new Date(now.getTime() + SUBSCRIPTION_PERIOD_MS);

    // Atomic compare-and-set: only succeeds when the document still has
    // sufficient balance AND no currently active+unexpired subscription.
    // Two concurrent POSTs cannot both pass this filter — one will fail
    // with no match and we return 400, preventing double-spend / re-subscribe.
    const updated = await User.findOneAndUpdate(
      {
        _id: sessionUser._id,
        role: "ADMIN",
        balance: { $gte: amount },
        $or: [
          { subscriptionStatus: { $ne: "active" } },
          { subscriptionEndDate: { $lte: now } },
          { subscriptionEndDate: { $exists: false } },
          { subscriptionEndDate: null },
        ],
      },
      {
        $inc: { balance: -amount },
        $set: {
          currentPlan: planId,
          subscriptionStatus: "active",
          isOnTrial: false,
          maxLeads: plan.maxLeads,
          maxUsers: plan.maxUsers,
          subscriptionStartDate: now,
          subscriptionEndDate: newEndDate,
        },
      },
      { new: true },
    );

    if (!updated) {
      // Distinguish the two failure modes for a better client message.
      const fresh = await User.findById(sessionUser._id)
        .select({ balance: 1, subscriptionStatus: 1, subscriptionEndDate: 1 })
        .lean();
      const hasActive =
        fresh?.subscriptionStatus === "active" &&
        fresh?.subscriptionEndDate &&
        new Date(fresh.subscriptionEndDate) > now;
      if (hasActive) {
        return NextResponse.json(
          { error: "You already have an active subscription" },
          { status: 400 },
        );
      }
      const current = roundCents(fresh?.balance ?? 0);
      return NextResponse.json(
        {
          error: "Insufficient balance",
          required: amount,
          current,
          shortfall: roundCents(amount - current),
        },
        { status: 400 },
      );
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[subscription/subscribe] user=${sessionUser._id} plan=${planId}`,
      );
    }

    return NextResponse.json({
      success: true,
      message: `Successfully subscribed to ${plan.name} plan`,
      newBalance: roundCents(updated.balance ?? 0),
      plan: {
        id: plan.id,
        name: plan.name,
        maxLeads: plan.maxLeads,
        maxUsers: plan.maxUsers,
      },
    });
  } catch (error) {
    console.error("[subscription/subscribe] failed", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
