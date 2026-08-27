import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import mongoose from "mongoose";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { getSuperAdminEmails } from "@/lib/notificationQuery";
import { isAdmin, isTenantStaff } from "@/lib/roles";

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
    const sessionUserId =
      typeof session.user.id === "string" ? session.user.id : "";

    // Prefer stable _id from the JWT — email+adminId string queries miss ObjectId
    // adminId in Mongo and can return the wrong row after role changes.
    let user =
      sessionUserId && mongoose.Types.ObjectId.isValid(sessionUserId)
        ? await db.collection("users").findOne({
            _id: new ObjectId(sessionUserId),
          })
        : null;

    if (!user) {
      const query: Record<string, unknown> = { email: emailNormalized };
      if (isTenantStaff(session.user.role)) {
        if (session.user.adminId) {
          const adminIdRaw = String(session.user.adminId);
          if (mongoose.Types.ObjectId.isValid(adminIdRaw)) {
            query.adminId = new ObjectId(adminIdRaw);
          } else {
            query.adminId = adminIdRaw;
          }
        }
      } else if (isAdmin(session.user.role)) {
        query.role = "ADMIN";
      }

      user = await db.collection("users").findOne(query);
    }

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
      { status: 500 },
    );
  }
}
