import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Ably from "ably";
import { authOptions } from "@/libs/auth";
import {
  canAccessAllLeads,
  getTenantAdminId,
  isAdmin,
} from "@/lib/roles";
import {
  getAdminLeadsChannelName,
  getSuperAdminNotificationsChannelName,
  getUserCallLogsChannelName,
  getUserRemindersChannelName,
} from "@/libs/realtime";
import { getSuperAdminEmails } from "@/lib/notificationQuery";

interface SessionUser {
  id: string;
  role: string;
  adminId?: string;
  permissions?: string[];
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

export async function POST() {
  return handleTokenRequest();
}

export async function GET() {
  return handleTokenRequest();
}

async function handleTokenRequest() {
  try {
    const session = (await getServerSession(authOptions)) as SessionShape | null;
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "ABLY_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const adminScope = getAdminScope(session.user);
    const client = new Ably.Rest(apiKey);

    // Tenant staff with All Leads need the wildcard so timeline/realtime
    // stays in sync across assign, status, and comment channels.
    const capabilityMap: Record<string, string[]> = canAccessAllLeads(
      session.user,
    )
      ? { [`crm:admin:${adminScope}:*`]: ["subscribe"] }
      : {
          [getAdminLeadsChannelName(adminScope)]: ["subscribe"],
          [getUserRemindersChannelName(adminScope, session.user.id)]: [
            "subscribe",
          ],
          [getUserCallLogsChannelName(adminScope, session.user.id)]: [
            "subscribe",
          ],
        };

    if (isSuperAdminUser(session.user)) {
      capabilityMap[getSuperAdminNotificationsChannelName()] = ["subscribe"];
    }

    const capability = JSON.stringify(capabilityMap);

    // Return TokenDetails directly to the browser SDK to avoid
    // client-side tokenRequest exchange edge-cases.
    const tokenDetails = await client.auth.requestToken({
      clientId: session.user.id,
      capability,
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenDetails);
  } catch (error) {
    console.error("Error creating Ably token request:", error);
    return NextResponse.json(
      { message: "Failed to create Ably token" },
      { status: 500 },
    );
  }
}
