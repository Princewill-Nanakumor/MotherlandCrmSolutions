// src/app/api/roles/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { connectMongoDB } from "@/lib/dbConfig";
import Role from "@/models/Role";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectMongoDB();

    // Build query with multi-tenancy filter
    const query: { adminId?: string } = {};

    if (session.user.role === "ADMIN") {
      // Admin sees only roles they created
      query.adminId = session.user.id;
    } else if (session.user.role === "AGENT" && session.user.adminId) {
      // Agent sees roles from their admin
      query.adminId = session.user.adminId;
    }

    const roles = await Role.find(query).populate("permissions");

    return NextResponse.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { message: "Error fetching roles" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { name, description, permissions } = await request.json();

    await connectMongoDB();

    const role = await Role.create({
      name,
      description,
      permissions,
      adminId: session.user.id, // Multi-tenancy: admin owns the role
      createdBy: session.user.id,
    });

    return NextResponse.json(
      { message: "Role created successfully", role },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { message: "Error creating role" },
      { status: 500 }
    );
  }
}
