import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { getAllLeadsForSession } from "@/services/leads/getAllLeadsService";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";

export async function GET(request: NextRequest) {
  const perf = new ApiRoutePerf("GET /api/leads/all");
  try {
    const session = await getServerSession(authOptions);
    perf.mark("getServerSession");
    if (!session) {
      perf.finish({ status: 401 });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    );
    perf.mark("serialize");
    perf.finish({ leads: result.leads.length, total: result.total });
    return NextResponse.json(result, { headers: perf.responseHeaders() });
  } catch (error) {
    console.error("Error fetching leads:", error);
    perf.finish({ error: true });

    let errorMessage = "Failed to fetch leads";
    let statusCode = 500;

    if (error instanceof Error) {
      if (error.message.includes("timeout")) {
        errorMessage = "Request timed out. Please try again.";
        statusCode = 408;
      } else if (error.message.includes("connection")) {
        errorMessage = "Database connection error. Please try again.";
        statusCode = 503;
      } else if (error.message.includes("Unauthorized")) {
        errorMessage = "Unauthorized access";
        statusCode = 401;
      }
    }

    return NextResponse.json({ error: errorMessage }, { status: statusCode });
  }
}
