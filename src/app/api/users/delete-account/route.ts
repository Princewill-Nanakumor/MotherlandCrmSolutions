// /Users/safeconnection/Downloads/drivecrm/src/app/api/users/delete-account/route.ts

import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Status from "@/models/Status";
import { unauthorizedResponse } from "@/lib/apiResponses";

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return unauthorizedResponse();
    }

    const { password } = await req.json();
    if (!password) {
      return NextResponse.json(
        { error: "Password is required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Find the admin user
    const admin = await User.findOne({
      email: session.user.email,
      role: "ADMIN",
    });
    if (!admin || !admin.password) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 400 }
      );
    }

    // Delete all leads belonging to the admin
    await Lead.deleteMany({ adminId: admin._id });

    // Delete all statuses belonging to the admin
    await Status.deleteMany({ adminId: admin._id });

    // Delete all agents under the admin
    await User.deleteMany({ parentAdminId: admin._id, role: "AGENT" });

    // Delete the admin user
    await User.deleteOne({ _id: admin._id });

    return NextResponse.json({
      message: "Account and all related data deleted successfully",
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
