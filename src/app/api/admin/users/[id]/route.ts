import { NextResponse, NextRequest } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/lib/dbConfig";
import User from "@/models/User";
import { authOptions } from "@/lib/auth";
import mongoose from "mongoose";

export async function PUT(request: NextRequest) {
  try {
    // Extract the id from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 1];

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    await connectMongoDB();

    // Only allow updating users created by this admin (multi-tenancy)
    const updatedUser = await User.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        adminId: new mongoose.Types.ObjectId(session.user.id), // Multi-tenancy filter
      },
      { ...data, updatedAt: new Date() },
      { new: true }
    ).select("-password");

    if (!updatedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { message: "Error updating user" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Extract the id from the URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const id = pathParts[pathParts.length - 1];

    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    // Only allow deleting users created by this admin (multi-tenancy)
    const deletedUser = await User.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      adminId: new mongoose.Types.ObjectId(session.user.id), // Multi-tenancy filter
    });

    if (!deletedUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { message: "Error deleting user" },
      { status: 500 }
    );
  }
}
