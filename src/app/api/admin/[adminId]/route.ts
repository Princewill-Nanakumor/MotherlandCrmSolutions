import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Subscription from "@/models/Subscription";
import Activity from "@/models/Activity";
import Payment from "@/models/Payment";
import mongoose from "mongoose";

// Force dynamic rendering - this route should not be statically analyzed at build time
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Define interface for Ad (placeholder - you can create an Ad model later)
interface Ad {
  _id: string;
  title: string;
  description: string;
  imageUrl: string;
  status: string;
  createdAt: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get allowed emails from environment variable
    const allowedEmails =
      process.env.SUPER_ADMIN_EMAILS?.split(",").map((email) => email.trim()) ||
      [];

    // Check if the user's email is in the allowed list
    if (
      allowedEmails.length > 0 &&
      !allowedEmails.includes(session.user.email)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await connectMongoDB();

    // Await the params to get the adminId
    const { adminId } = await params;
    const adminObjectId = new mongoose.Types.ObjectId(adminId);

    // Get admin details
    const admin = await User.findById(adminObjectId).lean();
    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Get all agents under this admin
    const agents = await User.find({
      adminId: adminObjectId,
      role: "AGENT",
    })
      .select("firstName lastName email status lastLogin createdAt")
      .sort({ lastLogin: -1 })
      .lean();

    // Get leads for this admin
    const leads = await Lead.find({ adminId: adminObjectId })
      .select("firstName lastName email status createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    // Get subscription
    const subscription = await Subscription.findOne({
      adminId: adminObjectId,
    }).lean();

    // Get recent activities for this admin
    const activities = await Activity.find({
      adminId: adminObjectId,
    })
      .populate("userId", "firstName lastName email")
      .sort({ timestamp: -1 })
      .limit(50)
      .lean();

    // Get payments for this admin
    const payments = await Payment.find({ adminId: adminObjectId })
      .sort({ createdAt: -1 })
      .lean();

    // Get ads (placeholder - you might need to create an Ad model)
    const ads: Ad[] = [];

    return NextResponse.json({
      admin,
      agents,
      leads: {
        data: leads,
        total: await Lead.countDocuments({ adminId: adminObjectId }),
      },
      subscription,
      activities,
      payments,
      ads,
    });
  } catch (error) {
    console.error("Error fetching admin details:", error);
    return NextResponse.json(
      { error: "Failed to fetch admin details" },
      { status: 500 }
    );
  }
}
