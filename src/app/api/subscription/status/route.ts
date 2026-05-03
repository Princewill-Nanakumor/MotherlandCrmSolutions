// src/app/api/subscription/status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import { authOptions } from "@/libs/auth";
import User from "@/models/User";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const now = new Date();
    const trialEndDate = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
    const isOnTrialNow = Boolean(
      user.isOnTrial && trialEndDate && now < trialEndDate,
    );
    const trialExpired = Boolean(trialEndDate && now > trialEndDate);

    const subscriptionEndDate = user.subscriptionEndDate
      ? new Date(user.subscriptionEndDate)
      : null;
    const subscriptionExpired = Boolean(
      subscriptionEndDate && now > subscriptionEndDate,
    );

    let subscriptionStatus: "active" | "inactive" | "trial" | "expired";

    if (user.subscriptionStatus === "active") {
      if (subscriptionExpired) {
        subscriptionStatus = "expired";
        // Persist so analytics queries like { subscriptionStatus: "active" }
        // don't keep counting this user.
        await User.findByIdAndUpdate(session.user.id, {
          $set: { subscriptionStatus: "expired" },
        });
      } else {
        subscriptionStatus = "active";
      }
    } else if (isOnTrialNow) {
      subscriptionStatus = "trial";
    } else if (trialExpired) {
      subscriptionStatus = "expired";
      // H7: persist trial expiry so DB doesn't drift from API.
      if (user.subscriptionStatus === "trial" || user.isOnTrial) {
        await User.findByIdAndUpdate(session.user.id, {
          $set: { subscriptionStatus: "expired", isOnTrial: false },
        });
      }
    } else {
      subscriptionStatus = "inactive";
    }

    return NextResponse.json({
      isOnTrial: isOnTrialNow,
      trialEndsAt: user.trialEndsAt,
      currentPlan: user.currentPlan,
      subscriptionStatus,
      balance: user.balance ?? 0,
      subscriptionEndDate: user.subscriptionEndDate,
      subscriptionStartDate: user.subscriptionStartDate,
    });
  } catch (error) {
    console.error("Error fetching subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
