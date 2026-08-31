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
import { publishAdminLeadsUpdatedEvent } from "@/libs/ablyServer";
import { canManageUsers, getTenantAdminId } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !canManageUsers(session.user)) {
      return unauthorizedResponse();
    }

    const payload = await request.json();
    const result = await createUserForAdmin(
      session.user as {
        id: string;
        role: string;
        adminId?: string;
        permissions?: string[];
      },
      payload,
    );
    if (result.status >= 200 && result.status < 300) {
      try {
        await publishAdminLeadsUpdatedEvent(
          getTenantAdminId(session.user) || session.user.id,
          {
          type: "user_created",
          actorId: session.user.id,
        });
      } catch (publishError) {
        console.error("Ably publish failed after user creation:", publishError);
      }
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error("Error creating user:", error);
    const message =
      error instanceof Error ? error.message : "Error creating user";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function GET() {
  const perf = new ApiRoutePerf("GET /api/users");
  try {
    const session = await getServerSession(authOptions);
    perf.mark("getServerSession");

    if (!session) {
      perf.finish({ status: 401 });
      return unauthorizedResponse();
    }

    const result = await listUsersForSession(
      session.user as {
        id: string;
        role: string;
        adminId?: string;
        permissions?: string[];
      },
    );
    perf.mark("listUsersForSession");
    perf.finish({ status: result.status });
    return NextResponse.json(result.body, { status: result.status });
  } catch (error: unknown) {
    console.error("Error fetching users:", error);
    perf.finish({ error: true });
    const message =
      error instanceof Error ? error.message : "Error fetching users";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !canManageUsers(session.user)) {
      return NextResponse.json(
        { success: false, error: { message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const requestData = await request.json();
    const result = await updateUserForAdmin(
      session.user as {
        id: string;
        role: string;
        firstName?: string;
        lastName?: string;
        adminId?: string;
        permissions?: string[];
      },
      requestData,
    );
    if (result.status >= 200 && result.status < 300) {
      try {
        await publishAdminLeadsUpdatedEvent(
          getTenantAdminId(session.user) || session.user.id,
          {
          type: "user_updated",
          actorId: session.user.id,
          userId: requestData.id,
        });
      } catch (publishError) {
        console.error("Ably publish failed after user update:", publishError);
      }
    }
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

    if (!session || !canManageUsers(session.user)) {
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
      session.user as {
        id: string;
        role: string;
        firstName?: string;
        lastName?: string;
        adminId?: string;
        permissions?: string[];
      },
      id,
    );
    if (result.status >= 200 && result.status < 300) {
      try {
        await publishAdminLeadsUpdatedEvent(
          getTenantAdminId(session.user) || session.user.id,
          {
          type: "user_deleted",
          actorId: session.user.id,
          userId: id,
        });
      } catch (publishError) {
        console.error("Ably publish failed after user deletion:", publishError);
      }
    }
    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    console.error("Error deleting user:", error);
    const message =
      error instanceof Error ? error.message : "Error deleting user";
    return NextResponse.json({ message }, { status: 500 });
  }
}
