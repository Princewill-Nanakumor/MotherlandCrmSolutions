// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import User from "@/models/User";
import { connectMongoDB } from "@/libs/dbConfig";
import { Types } from "mongoose";
import { getSuperAdminEmails } from "@/lib/notificationQuery";

interface UserDocument {
  _id: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  balance?: number;
  status: string;
  adminId?: Types.ObjectId;
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  try {
    await connectMongoDB();

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Use case-insensitive search to handle email case differences
    const user = (await User.findOne({
      email: { $regex: new RegExp(`^${session.user.email}$`, "i") },
    }).lean()) as UserDocument | null;

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const superEmails = getSuperAdminEmails();
    const sessionEmail = session.user.email?.trim() ?? "";
    const isSuperAdmin =
      session.user.role === "ADMIN" &&
      superEmails.length > 0 &&
      superEmails.includes(sessionEmail);

    return NextResponse.json({
      success: true,
      user: {
        _id: String(user._id),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        balance: user.balance || 0,
        status: user.status,
        isSuperAdmin,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
