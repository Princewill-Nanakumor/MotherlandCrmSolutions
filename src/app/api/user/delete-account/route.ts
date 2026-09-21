// app/api/users/delete-account/route.ts

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectMongoDB } from "@/lib/dbConfig";
import User from "@/models/User";
import Payment from "@/models/Payment";
import Lead from "@/models/Lead";
import Activity from "@/models/Activity";
import bcrypt from "bcryptjs";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Find the user
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Start a session for transaction
    const session_db = await connectMongoDB().then((db) => db.startSession());

    try {
      await session_db.withTransaction(async () => {
        // Delete user's payments
        await Payment.deleteMany({
          createdBy: user._id,
        });

        // Delete user's leads (if they have any)
        await Lead.deleteMany({
          createdBy: user._id,
        });

        // Delete lead activities
        await Activity.deleteMany({
          createdBy: user._id,
        });

        // Finally, delete the user
        await User.findByIdAndDelete(user._id);
      });

      return NextResponse.json({
        success: true,
        message: "Account deleted successfully",
      });
    } finally {
      await session_db.endSession();
    }
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
