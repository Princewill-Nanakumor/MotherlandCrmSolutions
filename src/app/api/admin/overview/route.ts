// src/app/api/admin/overview/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Activity from "@/models/Activity";
import Payment from "@/models/Payment";
import {
  SUBSCRIPTION_TRIAL_DEFAULT_MAX_LEADS,
  SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS,
} from "@/lib/subscriptionPlanCatalog";

interface UserDocument {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  lastLogin?: Date;
  createdAt: Date;
  balance?: number;
  isOnTrial?: boolean;
  trialEndsAt?: Date;
  currentPlan?: string;
  subscriptionStatus?: string;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  maxLeads?: number;
  maxUsers?: number;
}

// Define proper types for the subscription
interface SubscriptionData {
  plan: string;
  status: string;
  maxUsers: number;
  maxLeads: number;
  endDate: Date;
}

// Helper function to extract subscription data from User model
function extractSubscriptionDataFromUser(
  user: UserDocument | null
): SubscriptionData | null {
  if (!user) return null;

  // Get subscription data from user fields (not separate Subscription collection)
  const now = new Date();
  const trialEndDate = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
  const isOnTrial = user.isOnTrial && trialEndDate && now < trialEndDate;
  const trialExpired = trialEndDate && now > trialEndDate;

  // Determine subscription status (same logic as /api/subscription/status)
  let subscriptionStatus: string;
  if (user.subscriptionStatus === "active") {
    subscriptionStatus = "ACTIVE"; // Use ACTIVE to match your filtering logic
  } else if (isOnTrial) {
    subscriptionStatus = "trial";
  } else if (trialExpired) {
    subscriptionStatus = "expired";
  } else {
    subscriptionStatus = "inactive";
  }

  return {
    plan: user.currentPlan || "trial",
    status: subscriptionStatus,
    maxUsers: user.maxUsers ?? SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS,
    maxLeads: user.maxLeads ?? SUBSCRIPTION_TRIAL_DEFAULT_MAX_LEADS,
    endDate: user.subscriptionEndDate || user.trialEndsAt || new Date(),
  };
}

// Helper function to safely transform lastAgentLogin
function extractLastAgentLogin(data: unknown) {
  if (!data || typeof data !== "object") return undefined;

  const agent = data as Record<string, unknown>;

  return {
    lastLogin: agent.lastLogin as Date | undefined,
    firstName: (agent.firstName as string) || "",
    lastName: (agent.lastName as string) || "",
  };
}

// Force dynamic rendering - skip build-time analysis
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // L2: normalize on both sides — emails are case-insensitive per RFC 5321,
    // and SUPER_ADMIN_EMAILS is configured by humans (mixed casing creeps in).
    const normEmail = (e: string) => e.trim().toLowerCase();
    const allowedEmails =
      process.env.SUPER_ADMIN_EMAILS?.split(",")
        .map((email) => email.trim())
        .filter(Boolean) || [];
    const allowedEmailsNormalized = new Set(allowedEmails.map(normEmail));

    if (
      allowedEmails.length > 0 &&
      !allowedEmailsNormalized.has(normEmail(session.user.email))
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await connectMongoDB();

    // Get all admins with subscription fields included
    const admins = await User.find({ role: "ADMIN" })
      .select(
        `
        firstName lastName email status lastLogin createdAt balance
        isOnTrial trialEndsAt currentPlan subscriptionStatus 
        subscriptionStartDate subscriptionEndDate maxLeads maxUsers
      `
      )
      .lean<UserDocument[]>();

    // Get stats for each admin
    const adminStats = await Promise.all(
      admins.map(async (admin: UserDocument) => {
        const adminId = admin._id;

        // Count agents under this admin
        const agentCount = await User.countDocuments({
          adminId: adminId,
          role: "AGENT",
        });

        // Count leads for this admin
        const leadCount = await Lead.countDocuments({
          adminId: adminId,
        });

        // ✅ Get subscription info from User model instead of Subscription collection
        const subscriptionData = extractSubscriptionDataFromUser(admin);

        // Get recent activity for this admin
        const recentActivity = await Activity.find({
          adminId: adminId,
        })
          .sort({ timestamp: -1 })
          .limit(5)
          .populate("userId", "firstName lastName email")
          .lean();

        // Get last agent login
        const lastAgentLoginRaw = await User.findOne({
          adminId: adminId,
          role: "AGENT",
        })
          .sort({ lastLogin: -1 })
          .select("lastLogin firstName lastName")
          .lean();

        // Get activity count for this admin
        const activityCount = await Activity.countDocuments({
          adminId: adminId,
        });

        // Get recent user login activities
        const recentLogins = await Activity.find({
          adminId: adminId,
          type: { $in: ["USER_LOGIN", "USER_LOGOUT"] },
        })
          .populate("userId", "firstName lastName email")
          .sort({ timestamp: -1 })
          .limit(3)
          .lean();

        // Get subscription activities
        const subscriptionActivities = await Activity.find({
          adminId: adminId,
          type: {
            $in: [
              "SUBSCRIPTION_CREATED",
              "SUBSCRIPTION_UPDATED",
              "SUBSCRIPTION_CANCELLED",
            ],
          },
        })
          .populate("userId", "firstName lastName email")
          .sort({ timestamp: -1 })
          .limit(3)
          .lean();

        // Get payment stats for this admin
        const paymentStats = await Payment.aggregate([
          { $match: { adminId: adminId } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
              totalAmount: { $sum: "$amount" },
            },
          },
        ]);

        // Safely transform lastAgentLogin
        const lastAgentLogin = extractLastAgentLogin(lastAgentLoginRaw);

        return {
          ...admin,
          agentCount,
          leadCount,
          activityCount,
          subscription: subscriptionData, // ✅ Now properly includes subscription data
          recentActivity,
          recentLogins,
          subscriptionActivities,
          lastAgentLogin,
          paymentStats,
        };
      })
    );

    // ✅ Calculate activeSubscriptions from User models instead of Subscription collection
    const activeSubscriptionsCount = await User.countDocuments({
      role: "ADMIN",
      $or: [
        { subscriptionStatus: "active" },
        {
          isOnTrial: true,
          trialEndsAt: { $gt: new Date() },
        },
      ],
    });

    let totalSuperAdmins = 0;
    for (const a of admins) {
      if (allowedEmailsNormalized.has(normEmail(a.email))) {
        totalSuperAdmins += 1;
      }
    }

    // Overall platform stats
    const totalAdmins = admins.length;
    const tenantOnlyAdmins = Math.max(0, totalAdmins - totalSuperAdmins);
    const totalAgents = await User.countDocuments({ role: "AGENT" });
    const totalLeads = await Lead.countDocuments();

    // Get total balance across all admins
    const totalBalance = await User.aggregate([
      { $match: { role: "ADMIN" } },
      {
        $group: {
          _id: null,
          totalBalance: { $sum: { $ifNull: ["$balance", 0] } },
        },
      },
    ]);

    // Get platform-wide activity stats
    const platformActivityStats = await Activity.aggregate([
      {
        $group: {
          _id: "$type",
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ]);

    // Get recent platform activities
    const recentPlatformActivities = await Activity.find({})
      .populate("userId", "firstName lastName")
      .populate("adminId", "firstName lastName")
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    // Get user login stats
    const userLoginStats = await Activity.aggregate([
      {
        $match: {
          type: { $in: ["USER_LOGIN", "USER_LOGOUT"] },
        },
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.date": -1 } },
      { $limit: 7 }, // Last 7 days
    ]);

    // Get payment stats across platform
    const platformPaymentStats = await Payment.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$amount" },
        },
      },
    ]);

    return NextResponse.json({
      admins: adminStats,
      superAdminEmailsNormalized: Array.from(allowedEmailsNormalized),
      platformStats: {
        totalAdmins,
        totalSuperAdmins,
        tenantOnlyAdmins,
        totalAgents,
        totalLeads,
        activeSubscriptions: activeSubscriptionsCount, // ✅ Now calculated correctly
        totalActivities: await Activity.countDocuments({}),
        totalBalance: totalBalance[0]?.totalBalance || 0,
      },
      platformActivityStats,
      recentPlatformActivities,
      userLoginStats,
      platformPaymentStats,
    });
  } catch (error) {
    console.error("Error fetching admin overview:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin overview" },
      { status: 500 }
    );
  }
}
