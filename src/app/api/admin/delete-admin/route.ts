// app/api/admin/delete-admin/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Status from "@/models/Status";
import { authOptions } from "@/libs/auth";

// Force dynamic rendering - skip build-time analysis
export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const runtime = "nodejs";

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get super admin emails from environment variable
    const superAdminEmails = process.env.SUPER_ADMIN_EMAILS?.split(",") || [];
    const isSuperAdmin = superAdminEmails.includes(session.user.email);

    // Only super admins can delete other admins
    if (session.user.role !== "ADMIN" || !isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super administrators can delete other admins" },
        { status: 403 }
      );
    }

    const { adminId, adminEmail } = await req.json();

    if (!adminId || !adminEmail) {
      return NextResponse.json(
        { error: "Admin ID and email are required" },
        { status: 400 }
      );
    }

    await connectMongoDB();

    // Prevent self-deletion
    if (session.user.id === adminId) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    // Find the admin to be deleted
    const adminToDelete = await User.findById(adminId);
    if (!adminToDelete) {
      return NextResponse.json(
        { error: "Administrator not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of other super admins
    if (superAdminEmails.includes(adminToDelete.email)) {
      return NextResponse.json(
        { error: "Cannot delete other super administrators" },
        { status: 403 }
      );
    }

    // Start transaction to delete everything
    const session_ = await User.startSession();
    await session_.withTransaction(async () => {
      // 1. Delete all agents under this admin
      const agentsToDelete = await User.find({ adminId: adminId });
      const agentIds = agentsToDelete.map((agent) => agent._id);

      await User.deleteMany({ adminId: adminId });

      // 2. Delete all leads under this admin
      await Lead.deleteMany({ adminId: adminId });

      // 3. Delete all statuses created by this admin
      await Status.deleteMany({ adminId: adminId });

      // 4. Delete all statuses created by agents under this admin
      await Status.deleteMany({ createdBy: { $in: agentIds } });

      // 5. Finally, delete the admin account
      await User.findByIdAndDelete(adminId);

      console.log(
        `Deleted admin ${adminEmail} with ${agentsToDelete.length} agents and all associated data`
      );
    });

    await session_.endSession();

    return NextResponse.json(
      {
        message: "Administrator and all associated data deleted successfully",
        deletedAdmin: {
          id: adminId,
          email: adminEmail,
          name: `${adminToDelete.firstName} ${adminToDelete.lastName}`,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting admin:", error);
    return NextResponse.json(
      { error: "Failed to delete administrator" },
      { status: 500 }
    );
  }
}
