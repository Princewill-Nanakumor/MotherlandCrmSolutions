import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/apiResponses";
import {
  TABOOLA_FIELD_MAPPING,
  adminReceivesTaboolaLeads,
  getTaboolaConfigSnapshot,
  getTaboolaWebhookUrl,
} from "@/lib/integrations/taboolaConfig";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }
  if (session.user.role !== "ADMIN") {
    return forbiddenResponse("Admin access required");
  }

  const origin = new URL(request.url).origin;
  const config = getTaboolaConfigSnapshot();

  return NextResponse.json({
    provider: "taboola",
    webhookUrl: getTaboolaWebhookUrl(origin),
    authHeader: "x-taboola-webhook-secret",
    method: "POST",
    contentType: "application/json",
    config,
    receivesLeadsForThisAdmin: adminReceivesTaboolaLeads(session.user.id),
    fieldMapping: TABOOLA_FIELD_MAPPING,
  });
}
