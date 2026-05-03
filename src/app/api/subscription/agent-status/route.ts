// src/app/api/subscription/agent-status/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { authOptions } from "@/libs/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    const agent = await User.findById(session.user.id);
    if (!agent) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (agent.role !== "AGENT") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // The tenant subscription lives on the admin who created the agent.
    // Prefer `adminId` (canonical) and fall back to `createdBy` for legacy rows.
    const tenantAdminId = agent.adminId ?? agent.createdBy;
    const admin = tenantAdminId ? await User.findById(tenantAdminId) : null;

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    const now = new Date();
    const trialEndDate = admin.trialEndsAt
      ? new Date(admin.trialEndsAt)
      : null;
    const isOnTrialNow = Boolean(
      admin.isOnTrial && trialEndDate && now < trialEndDate,
    );
    const trialExpired = Boolean(trialEndDate && now > trialEndDate);

    const subscriptionEndDate = admin.subscriptionEndDate
      ? new Date(admin.subscriptionEndDate)
      : null;
    const subscriptionExpired = Boolean(
      subscriptionEndDate && now > subscriptionEndDate,
    );

    let subscriptionStatus: "active" | "inactive" | "trial" | "expired";

    if (admin.subscriptionStatus === "active") {
      if (subscriptionExpired) {
        subscriptionStatus = "expired";
        // H6: persist on the admin row so the next read (and downstream
        // services like userService / tenantLeadImportLimits) see the same
        // state agents are being shown right now.
        await User.findByIdAndUpdate(admin._id, {
          $set: { subscriptionStatus: "expired" },
        });
      } else {
        subscriptionStatus = "active";
      }
    } else if (isOnTrialNow) {
      subscriptionStatus = "trial";
    } else if (trialExpired) {
      subscriptionStatus = "expired";
      if (admin.subscriptionStatus === "trial" || admin.isOnTrial) {
        await User.findByIdAndUpdate(admin._id, {
          $set: { subscriptionStatus: "expired", isOnTrial: false },
        });
      }
    } else {
      subscriptionStatus = "inactive";
    }

    return NextResponse.json({
      isOnTrial: isOnTrialNow,
      trialEndsAt: admin.trialEndsAt,
      currentPlan: admin.currentPlan,
      subscriptionStatus,
      balance: admin.balance ?? 0,
      adminName: `${admin.firstName} ${admin.lastName}`,
      adminEmail: admin.email,
    });
  } catch (error) {
    console.error("Error fetching agent subscription status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
