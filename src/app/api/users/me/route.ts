import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { getSuperAdminEmails } from "@/lib/notificationQuery";
import { isAdmin, isTenantStaff } from "@/lib/roles";

// Define proper types
interface UserQuery {
  email: string;
  adminId?: string;
  role?: string;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return unauthorizedResponse();
    }

    await connectMongoDB();

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error("Database connection not available");
    }

    const emailNormalized = session.user.email.trim().toLowerCase();
    const query: UserQuery = { email: emailNormalized };
    if (isTenantStaff(session.user.role)) {
      if (session.user.adminId) {
        query.adminId = session.user.adminId;
      }
    } else if (isAdmin(session.user.role)) {
      query.role = "ADMIN";
    }

    // Try to find the user
    let user = await db.collection("users").findOne(query);

    if (!user && isTenantStaff(session.user.role)) {
      user = await db.collection("users").findOne({ email: emailNormalized });
      if (!user && session.user.email.trim() !== emailNormalized) {
        user = await db
          .collection("users")
          .findOne({ email: session.user.email.trim() });
      }
    }

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const superEmails = getSuperAdminEmails();
    const sessionEmail = session.user.email?.trim() ?? "";
    const isSuperAdmin =
      session.user.role === "ADMIN" &&
      superEmails.length > 0 &&
      superEmails.includes(sessionEmail);

    const userProfile = {
      id: user._id.toString(),
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email,
      phoneNumber: user.phoneNumber || "",
      country: user.country || "",
      role: user.role || "AGENT",
      status: user.status || "ACTIVE",
      permissions: user.permissions || [],
      createdBy: user.createdBy?.toString() || "",
      createdAt: user.createdAt
        ? new Date(user.createdAt).toISOString()
        : new Date().toISOString(),
      lastLogin: user.lastLogin
        ? new Date(user.lastLogin).toISOString()
        : undefined,
      canViewPhoneNumbers: user.canViewPhoneNumbers ?? false,
      canViewEmails: user.canViewEmails ?? false,
      isSuperAdmin,
    };

    return NextResponse.json(userProfile);
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
