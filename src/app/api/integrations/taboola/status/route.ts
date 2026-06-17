import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/apiResponses";
import {
  TABOOLA_FIELD_MAPPING,
  getTaboolaConfigSnapshot,
  getTaboolaTenantStatus,
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

  const config = getTaboolaConfigSnapshot();
  const tenant = getTaboolaTenantStatus(session.user.id);

  return NextResponse.json({
    provider: "taboola",
    webhookUrl: tenant.canShareWithTaboola
      ? (tenant.webhookUrlForAdmin ?? getTaboolaWebhookUrl())
      : null,
    authHeader: "x-taboola-webhook-secret",
    method: "POST",
    contentType: "application/json",
    config,
    receivesLeadsForThisAdmin: tenant.receivesLeadsForThisAdmin,
    tenant,
    fieldMapping: tenant.canShareWithTaboola ? TABOOLA_FIELD_MAPPING : [],
  });
}
