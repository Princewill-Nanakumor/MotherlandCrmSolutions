import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { getSuperAdminEmails } from "@/lib/notificationQuery";
import { getTenantAdminId, isAdmin } from "@/lib/roles";
import { ApiRoutePerf } from "@/lib/apiRoutePerf";
import { apiPerfJsonResponse } from "@/lib/apiPerfJsonResponse";
import {
  sessionPerfMark,
  withSessionPerf,
} from "@/lib/sessionPerfProbe";

interface SessionUser {
  id: string;
  role: string;
  adminId?: string;
  email?: string | null;
}

interface SessionShape {
  user: SessionUser;
}

function getAdminScope(user: SessionUser): string {
  const tenantId = getTenantAdminId(user);
  if (!tenantId) throw new Error("Invalid user scope");
  return tenantId;
}

function isSuperAdminUser(user: SessionUser): boolean {
  if (!isAdmin(user.role)) return false;
  const email = user.email?.trim();
  if (!email) return false;
  return getSuperAdminEmails().includes(email);
}

export async function GET() {
  const wallStart = Date.now();
  const perf = new ApiRoutePerf("GET /api/ably/scope");
  try {
    const [session, sessionProbe] = await withSessionPerf(async () => {
      sessionPerfMark("getServerSessionEnter");
      const s = (await getServerSession(authOptions)) as SessionShape | null;
      sessionPerfMark("getServerSessionExit");
      return s;
    });
    perf.mark("getServerSession");

    if (!session?.user) {
      perf.finish({ status: 401 });
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const adminScope = getAdminScope(session.user);
    perf.mark("resolveScope");

    return apiPerfJsonResponse(
      perf,
      {
        adminScope,
        isSuperAdmin: isSuperAdminUser(session.user),
      },
      {
        sessionProbe,
        wallMs: Date.now() - wallStart,
      },
    );
  } catch (error) {
    console.error("Error resolving realtime scope:", error);
    perf.finish({ error: true, wallMs: Date.now() - wallStart });
    return NextResponse.json(
      { message: "Failed to resolve realtime scope" },
      { status: 500 },
    );
  }
}
