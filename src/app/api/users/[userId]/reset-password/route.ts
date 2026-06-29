import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { authOptions } from "@/libs/auth";
import bcrypt from "bcryptjs";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { invalidatePasswordChangedAtCache } from "@/lib/authPasswordVersion";
import { encryptRecoverablePassword } from "@/lib/passwordRecovery";

function extractUserIdFromUrl(urlString: string): string {
  const url = new URL(urlString);
  const parts = url.pathname.split("/");
  // Assumes route: /api/users/[userId]/reset-password
  // e.g. /api/users/123/reset-password -> parts = ["", "api", "users", "123", "reset-password"]
  return parts[parts.length - 2];
}

export async function POST(request: Request) {
  try {
    const userId = extractUserIdFromUrl(request.url);

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return unauthorizedResponse();
    }

    const { password } = await request.json();

    if (!password || password.length < 8) {
      return NextResponse.json(
        { message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    const hashedPassword = await bcrypt.hash(password, 10);
    const recoverablePassword = encryptRecoverablePassword(password);

    // Build query with multi-tenancy filter
    const query: { _id: string; createdBy?: string } = {
      _id: userId,
    };

    // Admin can only reset passwords for users they created
    query.createdBy = session.user.id;

    const now = new Date();
    const updatePayload: Record<string, unknown> = {
      password: hashedPassword,
      passwordChangedAt: now,
      updatedAt: now,
    };
    // Keep the recoverable copy in sync (agents are the only ones created via this flow).
    if (recoverablePassword) {
      updatePayload.recoverablePassword = recoverablePassword;
    }

    const user = await User.findOneAndUpdate(query, updatePayload, {
      new: true,
    });

    // Fix any email casing mismatch from raw MongoDB inserts
    if (user && user.email !== user.email.toLowerCase()) {
      user.email = user.email.toLowerCase();
      await user.save();
    }

    if (!user) {
      return NextResponse.json(
        { message: "User not found or not authorized" },
        { status: 404 }
      );
    }

    invalidatePasswordChangedAtCache(userId);

    return NextResponse.json({
      message: "Password reset successful",
      user: {
        id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return NextResponse.json(
      { message: "Error resetting password" },
      { status: 500 }
    );
  }
}
