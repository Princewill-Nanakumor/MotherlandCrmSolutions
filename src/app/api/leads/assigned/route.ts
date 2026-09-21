// app/api/leads/assigned/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { unauthorizedResponse, forbiddenResponse } from "@/lib/apiResponses";
import { isAdmin, isTenantStaff } from "@/lib/roles";
import { getAllLeadsForSession } from "@/services/leads/getAllLeadsService";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";

export async function GET(request: NextRequest) {
  const perf = new ApiRoutePerf("GET /api/leads/assigned");
  try {
    const session = await getServerSession(authOptions);
    perf.mark("getServerSession");
    if (!session?.user?.id) {
      perf.finish({ status: 401 });
      return unauthorizedResponse();
    }

    if (!isAdmin(session.user.role) && isTenantStaff(session.user.role) && !session.user.adminId) {
      return forbiddenResponse("Admin scope unresolved");
    }

    const result = await getAllLeadsForSession(
      request,
      {
        id: session.user.id,
        role: session.user.role,
        adminId: session.user.adminId,
        permissions: session.user.permissions,
        email: session.user.email,
      },
      perf,
      { assignedOnly: true },
    );

    perf.mark("serialize");
    perf.finish({ leads: result.leads.length, total: result.total });
    return NextResponse.json(
      {
        leads: result.leads,
        assignedLeads: result.leads,
        total: result.total,
        totalAll: result.totalAll,
        count: result.total,
      },
      { headers: perf.responseHeaders() },
    );
  } catch (error) {
    console.error("Error fetching assigned leads:", error);
    perf.finish({ error: true });

    if (error instanceof Error && error.message.includes("Admin scope unresolved")) {
      return forbiddenResponse("Admin scope unresolved");
    }

    let errorMessage = "Error fetching assigned leads";
    let statusCode = 500;
    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 408;
      } else if (error.message.includes("connection")) {
        errorMessage = "Database connection error. Please try again.";
        statusCode = 503;
      }
    }

    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}
