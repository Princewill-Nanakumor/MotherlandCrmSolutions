import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";

interface LoginInfoUser {
  _id: mongoose.Types.ObjectId;
  role: string;
  adminId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  lastLogin?: Date;
  lastLoginInfo?: {
    ip?: string;
    country?: string;
    countryCode?: string;
    device?: string;
    os?: string;
    browser?: string;
    userAgent?: string;
    at?: Date;
  };
}

/**
 * GET /api/users/[userId]/login-info
 * Returns the most recent login context (device, OS, browser, country, time)
 * for a user. Admins may view users in their tenant; users may view their own.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const { userId } = await params;

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedResponse();
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    const isSelf = session.user.id === userId;
    if (!isSelf && session.user.role !== "ADMIN") {
      return forbiddenResponse("Only admins can view login information");
    }

    await connectMongoDB();

    const targetUser = (await User.findById(userId)
      .select("role adminId createdBy lastLogin lastLoginInfo")
      .lean()) as LoginInfoUser | null;

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Tenant scope: admins may only view users they own.
    if (!isSelf) {
      const adminId = session.user.id;
      const ownsUser =
        targetUser.adminId?.toString() === adminId ||
        targetUser.createdBy?.toString() === adminId;
      if (!ownsUser) {
        return forbiddenResponse("This user belongs to another admin");
      }
    }

    const info = targetUser.lastLoginInfo;

    return NextResponse.json({
      success: true,
      lastLogin: targetUser.lastLogin?.toISOString() ?? null,
      loginInfo: info
        ? {
            ip: info.ip ?? null,
            country: info.country ?? null,
            countryCode: info.countryCode ?? null,
            device: info.device ?? null,
            os: info.os ?? null,
            browser: info.browser ?? null,
            at: info.at
              ? new Date(info.at).toISOString()
              : (targetUser.lastLogin?.toISOString() ?? null),
          }
        : null,
    });
  } catch (error) {
    console.error("Error retrieving login info:", error);
    return NextResponse.json(
      { error: "Failed to retrieve login information" },
      { status: 500 },
    );
  }
}
