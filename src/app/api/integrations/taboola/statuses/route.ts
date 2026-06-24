import { NextRequest, NextResponse } from "next/server";
import { withDatabase } from "@/libs/dbConfig";
import { verifyTaboolaWebhookSecret } from "@/lib/integrations/taboola";
import {
  getTaboolaStatusValues,
  resolveTaboolaPartnerAdminId,
} from "@/lib/integrations/taboolaPartnerApi";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
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

  try {
    return await withDatabase(async () => {
      const values = await getTaboolaStatusValues(adminId);

      return NextResponse.json({
        provider: "taboola",
        statusField: "status",
        values,
      });
    });
  } catch (error) {
    console.error("Taboola statuses error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
