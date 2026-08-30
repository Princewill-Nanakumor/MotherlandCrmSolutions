import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import Ably from "ably";
import { authOptions } from "@/libs/auth";
import { getTenantAdminId } from "@/lib/roles";
import { getTenantChannelName } from "@/libs/realtime";

/**
 * Legacy lead-scoped token endpoint.
 * Per-lead channels are removed; issues a token for the tenant channel only
 * so older clients do not create extra Ably channels.
 */
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "ABLY_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const adminScope = getTenantAdminId(session.user);
    if (!adminScope) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const client = new Ably.Rest(apiKey);
    const capability = JSON.stringify({
      [getTenantChannelName(adminScope)]: ["subscribe"],
    });

    const tokenDetails = await client.auth.requestToken({
      clientId: session.user.id,
      capability,
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenDetails);
  } catch (error) {
    console.error("Error creating Ably lead token:", error);
    return NextResponse.json(
      { message: "Failed to create Ably token" },
      { status: 500 },
    );
  }
}
