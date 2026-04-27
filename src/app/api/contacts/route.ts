import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import {
  deleteContact,
  getContacts,
  importContacts,
  updateContact,
} from "@/services/contacts/contactService";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return importContacts(request, {
      id: session.user.id,
      role: session.user.role,
      adminId: session.user.adminId,
    });
  } catch (err) {
    console.error("Error processing data:", err);
    return NextResponse.json(
      {
        error: "Error processing data",
        details: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return getContacts({
      id: session.user.id,
      role: session.user.role,
      adminId: session.user.adminId,
    });
  } catch (error) {
    console.error("Error in GET contacts:", error);
    return NextResponse.json(
      { error: "Failed to fetch contacts" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return updateContact(request, {
      id: session.user.id,
      role: session.user.role,
      adminId: session.user.adminId,
    });
  } catch (error) {
    console.error("Error in PUT contact:", error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return deleteContact(request, {
      id: session.user.id,
      role: session.user.role,
      adminId: session.user.adminId,
    });
  } catch (error) {
    console.error("Error in DELETE contact:", error);
    return NextResponse.json(
      { error: "Failed to delete contact" },
      { status: 500 }
    );
  }
}
