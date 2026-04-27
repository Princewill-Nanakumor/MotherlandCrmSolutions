import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/libs/dbConfig";
import Role from "@/models/Role";
import { authOptions } from "@/libs/auth";
import mongoose from "mongoose";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const runtime = "nodejs";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid role id" }, { status: 400 });
    }

    const { name, description, permissions } = await request.json();

    await connectMongoDB();

    const role = await Role.findByIdAndUpdate(
      id,
      { name, description, permissions },
      { new: true, runValidators: true },
    );

    if (!role) {
      return NextResponse.json({ message: "Role not found" }, { status: 404 });
    }

    return NextResponse.json({
      message: "Role updated successfully",
      role,
    });
  } catch (error) {
    console.error("PUT /api/roles/[id]:", error);
    return NextResponse.json(
      { message: "Error updating role" },
      { status: 500 },
    );
  }
}
