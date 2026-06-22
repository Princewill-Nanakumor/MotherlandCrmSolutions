/**
 * Taboola live lead webhook.
 *
 * Env:
 * - TABOOLA_WEBHOOK_SECRET (required in production)
 * - TABOOLA_DEFAULT_ADMIN_ID (Mongo admin user id for leads)
 * - TABOOLA_ALLOWED_ADMIN_IDS (optional comma list for ?adminId=)
 * - TABOOLA_CAMPAIGN_ADMIN_MAP (optional JSON: { "campaignId": "adminObjectId" })
 */
import { NextRequest, NextResponse } from "next/server";
import { connectMongoDB, withDatabase } from "@/libs/dbConfig";
import { createInboundLead } from "@/lib/integrations/createInboundLead";
import {
  mapTaboolaToLead,
  parseTaboolaPayload,
  parseTaboolaRequestBody,
  resolveTaboolaAdminId,
  verifyTaboolaWebhookSecret,
} from "@/lib/integrations/taboola";

export const runtime = "nodejs";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  if (!verifyTaboolaWebhookSecret(request, url)) {
    return unauthorized();
  }

  return NextResponse.json({
    ok: true,
    provider: "taboola",
    message: "Taboola lead webhook is ready",
  });
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  let rawBody: Record<string, unknown>;
  try {
    rawBody = await parseTaboolaRequestBody(request);
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!verifyTaboolaWebhookSecret(request, url, rawBody)) {
    return unauthorized();
  }

  try {
    return await withDatabase(async () => {
      const taboolaPayload = parseTaboolaPayload(rawBody);
      const mapped = mapTaboolaToLead(taboolaPayload);

      if (!mapped.email) {
        return NextResponse.json({ error: "Email is required" }, { status: 400 });
      }

      const adminId = resolveTaboolaAdminId({
        campaignId: mapped.campaignId,
        explicitAdminId:
          url.searchParams.get("adminId") ??
          (typeof rawBody.adminId === "string" ? rawBody.adminId : undefined),
      });

      if (!adminId) {
        return NextResponse.json(
          {
            error:
              "Could not resolve tenant admin. Configure TABOOLA_DEFAULT_ADMIN_ID or TABOOLA_CAMPAIGN_ADMIN_MAP.",
          },
          { status: 400 },
        );
      }

      const result = await createInboundLead({
        provider: "taboola",
        externalId: mapped.externalId,
        adminId,
        firstName: mapped.firstName,
        lastName: mapped.lastName,
        email: mapped.email,
        phone: mapped.phone,
        country: mapped.country,
        source: mapped.source,
        comments: mapped.comments,
        activityDetails: `Lead imported from Taboola (${mapped.email})`,
        activityMetadata: {
          source: "Taboola",
          email: mapped.email,
          clickId: mapped.metadata.clickId || undefined,
          page: mapped.metadata.page || undefined,
          language: mapped.metadata.language || undefined,
          ipAddress: mapped.metadata.ip || undefined,
          campaignId: mapped.campaignId || undefined,
        },
      });

      if (!result.ok) {
        return NextResponse.json(result.body, { status: result.status });
      }

      return NextResponse.json({
        success: true,
        duplicate: result.duplicate,
        message: result.duplicate
          ? "Lead already received"
          : "Lead created successfully",
        lead: result.lead,
      });
    });
  } catch (error) {
    console.error("Taboola webhook error:", error);
    const details =
      error instanceof Error ? error.message : "Unknown server error";
    return NextResponse.json(
      {
        error: "Internal server error",
        ...(process.env.NODE_ENV !== "production" ? { details } : {}),
      },
      { status: 500 },
    );
  }
}
