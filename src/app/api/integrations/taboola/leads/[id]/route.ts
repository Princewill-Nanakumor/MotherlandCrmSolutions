import { NextRequest, NextResponse } from "next/server";
import { withDatabase } from "@/libs/dbConfig";
import { verifyTaboolaWebhookSecret } from "@/lib/integrations/taboola";
import {
  getTaboolaPartnerLead,
  resolveTaboolaPartnerAdminId,
} from "@/lib/integrations/taboolaPartnerApi";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const url = new URL(request.url);
  if (!verifyTaboolaWebhookSecret(request, url)) {
    return unauthorized();
  }

  const adminId = resolveTaboolaPartnerAdminId(url);
  if (!adminId) {
    return NextResponse.json(
      {
        error:
          "Could not resolve tenant admin. Configure TABOOLA_DEFAULT_ADMIN_ID.",
      },
      { status: 400 },
    );
  }

  const { id } = await params;

  try {
    return await withDatabase(async () => {
      const lead = await getTaboolaPartnerLead({
        adminId,
        identifier: id,
      });

      if (!lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        lead,
      });
    });
  } catch (error) {
    console.error("Taboola get lead error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
