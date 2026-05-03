import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import mongoose from "mongoose";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Activity from "@/models/Activity";
import Status from "@/models/Status";
import Payment from "@/models/Payment";
import Comment from "@/models/Comment";
import Reminder from "@/models/Reminder";
import Import from "@/models/Import";
import CallLog from "@/models/CallLog";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isSuperAdminEmail(email: string): boolean {
  const list =
    process.env.SUPER_ADMIN_EMAILS?.split(",").map((e) => e.trim()) ?? [];
  return list.length > 0 && list.includes(email);
}

export async function DELETE(
  _req: Request,
  {
    params,
  }: { params: Promise<{ adminId: string; agentId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!isSuperAdminEmail(session.user.email)) {
      return NextResponse.json(
        { error: "Only super administrators can remove agents from a tenant" },
        { status: 403 },
      );
    }

    const { adminId, agentId } = await params;

    if (
      !mongoose.Types.ObjectId.isValid(adminId) ||
      !mongoose.Types.ObjectId.isValid(agentId)
    ) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const tenantAdminId = new mongoose.Types.ObjectId(adminId);
    const agentObjectId = new mongoose.Types.ObjectId(agentId);

    await connectMongoDB();

    const tenantAdmin = await User.findOne({
      _id: tenantAdminId,
      role: "ADMIN",
    }).lean();
    if (!tenantAdmin) {
      return NextResponse.json(
        { error: "Administrator not found" },
        { status: 404 },
      );
    }

    const agent = await User.findOne({
      _id: agentObjectId,
      role: "AGENT",
      adminId: tenantAdminId,
    });
    if (!agent) {
      return NextResponse.json(
        { error: "Agent not found under this administrator" },
        { status: 404 },
      );
    }

    const dbSession = await mongoose.startSession();
    try {
      await dbSession.withTransaction(async () => {
        await Payment.deleteMany({ createdBy: agentObjectId }).session(dbSession);
        await Lead.deleteMany({ createdBy: agentObjectId }).session(dbSession);
        await Activity.deleteMany({ userId: agentObjectId }).session(dbSession);
        await Status.deleteMany({ createdBy: agentObjectId }).session(dbSession);
        await Comment.deleteMany({
          adminId: tenantAdminId,
          "createdBy._id": agentObjectId.toString(),
        }).session(dbSession);
        await Reminder.deleteMany({
          $or: [
            { createdBy: agentObjectId },
            { assignedTo: agentObjectId },
          ],
        }).session(dbSession);
        await Import.deleteMany({ uploadedBy: agentObjectId }).session(
          dbSession,
        );
        await CallLog.deleteMany({ userId: agentObjectId }).session(dbSession);
        await User.deleteOne({ _id: agentObjectId }).session(dbSession);
      });
    } finally {
      await dbSession.endSession();
    }

    return NextResponse.json({
      message: "Agent removed successfully",
      deletedAgentId: agentId,
    });
  } catch (error) {
    console.error("delete-agent-from-tenant:", error);
    return NextResponse.json(
      { error: "Failed to remove agent" },
      { status: 500 },
    );
  }
}
