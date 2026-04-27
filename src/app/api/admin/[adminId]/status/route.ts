import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ adminId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdminEmails =
      process.env.SUPER_ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
    if (
      session.user.role !== "ADMIN" ||
      !superAdminEmails.includes(session.user.email)
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { adminId } = await params;
    if (!mongoose.Types.ObjectId.isValid(adminId)) {
      return NextResponse.json({ error: "Invalid admin ID" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body as { status?: string };
    if (status !== "ACTIVE" && status !== "INACTIVE") {
      return NextResponse.json(
        { error: "Status must be ACTIVE or INACTIVE" },
        { status: 400 },
      );
    }

    await connectMongoDB();

    const existing = await User.findOne({
      _id: new mongoose.Types.ObjectId(adminId),
      role: "ADMIN",
    }).lean();

    if (!existing) {
      return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
    }

    const updated = await User.findByIdAndUpdate(
      adminId,
      { status, updatedAt: new Date() },
      { new: true },
    ).lean();

    return NextResponse.json({
      success: true,
      admin: updated,
    });
  } catch (error) {
    console.error("PATCH /api/admin/[adminId]/status:", error);
    return NextResponse.json(
      { error: "Failed to update administrator status" },
      { status: 500 },
    );
  }
}
