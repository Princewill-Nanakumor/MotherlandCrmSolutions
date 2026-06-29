import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { decryptRecoverablePassword } from "@/lib/passwordRecovery";

interface RecoverableUser {
  _id: mongoose.Types.ObjectId;
  role: string;
  adminId?: mongoose.Types.ObjectId;
  createdBy?: mongoose.Types.ObjectId;
  recoverablePassword?: string;
}

/**
 * GET /api/users/[userId]/password
 * Admin-only. Returns the recoverable plaintext password for an AGENT that
 * belongs to the requesting admin. Never returns admin passwords.
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
    if (session.user.role !== "ADMIN") {
      return forbiddenResponse("Only admins can view agent passwords");
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return NextResponse.json({ error: "Invalid user ID" }, { status: 400 });
    }

    await connectMongoDB();

    const targetUser = (await User.findById(userId)
      .select("role adminId createdBy recoverablePassword")
      .lean()) as RecoverableUser | null;

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Never expose admin passwords.
    if (targetUser.role !== "AGENT") {
      return forbiddenResponse("Passwords are only viewable for agents");
    }

    // Tenant scope: the agent must belong to this admin.
    const adminId = session.user.id;
    const ownsAgent =
      targetUser.adminId?.toString() === adminId ||
      targetUser.createdBy?.toString() === adminId;
    if (!ownsAgent) {
      return forbiddenResponse("This agent belongs to another admin");
    }

    const password = decryptRecoverablePassword(targetUser.recoverablePassword);

    if (!password) {
      return NextResponse.json({
        success: true,
        available: false,
        password: null,
        message:
          "This agent's password is not recoverable. Use Reset Password to set a new one you can share.",
      });
    }

    return NextResponse.json({
      success: true,
      available: true,
      password,
    });
  } catch (error) {
    console.error("Error retrieving agent password:", error);
    return NextResponse.json(
      { error: "Failed to retrieve password" },
      { status: 500 },
    );
  }
}
