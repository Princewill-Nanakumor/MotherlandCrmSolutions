import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import {
  createUserForAdmin,
  deleteUserForAdmin,
  listUsersForSession,
  updateUserForAdmin,
} from "@/services/users/userService";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return unauthorizedResponse();
    }

    const payload = await request.json();
    const result = await createUserForAdmin(session.user.id, payload);
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const message =
      error instanceof Error ? error.message : "Error creating user";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return unauthorizedResponse();
    }

    const result = await listUsersForSession(session.user as { id: string; role: string });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    const message =
      error instanceof Error ? error.message : "Error fetching users";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    const result = await updateUserForAdmin(
      session.user as { id: string; role: string; firstName?: string; lastName?: string },
      requestData,
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error("Error updating user:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: number }).code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            field: "email",
            message: "A user with this email already exists.",
            code: "DUPLICATE_EMAIL",
          },
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          message:
            error instanceof Error
              ? error.message
              : "An unexpected error occurred",
          code: "INTERNAL_SERVER_ERROR",
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent admin from deleting themselves
    if (id === session.user.id) {
      return NextResponse.json(
        { message: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    const result = await deleteUserForAdmin(
      session.user as { id: string; role: string; firstName?: string; lastName?: string },
      id,
    );
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Error deleting user:", error);
    const message =
      error instanceof Error ? error.message : "Error deleting user";
    return NextResponse.json({ message }, { status: 500 });
  }
}
