import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { connectMongoDB } from "@/libs/dbConfig";
import User from "@/models/User";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/apiResponses";
import {
  getTaboolaConfigSnapshot,
  getTaboolaTenantStatus,
  getTaboolaWebhookUrl,
} from "@/lib/integrations/taboolaConfig";

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }
  if (session.user.role !== "ADMIN") {
    return forbiddenResponse("Admin access required");
  }

  const tenant = getTaboolaTenantStatus(session.user.id);
  if (!tenant.canShareWithTaboola) {
    return forbiddenResponse(
      "Taboola is not configured for your admin account",
      "TABOOLA_NOT_CONFIGURED_FOR_TENANT",
    );
  }

  const config = getTaboolaConfigSnapshot();
  const checks: Array<{ name: string; ok: boolean; message: string }> = [];

  checks.push({
    name: "Webhook secret",
    ok: config.secretConfigured,
    message: config.secretConfigured
      ? "TABOOLA_WEBHOOK_SECRET is configured"
      : "Set TABOOLA_WEBHOOK_SECRET on the server",
  });

  checks.push({
    name: "Tenant routing",
    ok: config.defaultAdminConfigured || config.campaignMappingsCount > 0,
    message:
      config.defaultAdminConfigured || config.campaignMappingsCount > 0
        ? "Default admin or campaign map is configured"
        : "Set TABOOLA_DEFAULT_ADMIN_ID or TABOOLA_CAMPAIGN_ADMIN_MAP",
  });

  if (config.defaultAdminConfigured && config.defaultAdminId) {
    await connectMongoDB();
    const admin = await User.findOne({
      _id: config.defaultAdminId,
      role: "ADMIN",
    })
      .select({ _id: 1 })
      .lean();
    checks.push({
      name: "Default admin account",
      ok: Boolean(admin),
      message: admin
        ? "Default admin user exists"
        : "TABOOLA_DEFAULT_ADMIN_ID does not match an ADMIN user",
    });
  }

  let webhookReachable = false;
  const secret = process.env.TABOOLA_WEBHOOK_SECRET?.trim();
  if (secret) {
    try {
      const healthUrl = `${getTaboolaWebhookUrl()}?secret=${encodeURIComponent(secret)}`;
      const response = await fetch(healthUrl, {
        method: "GET",
        cache: "no-store",
      });
      webhookReachable = response.ok;
      const body = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
      };
      checks.push({
        name: "Webhook endpoint",
        ok: response.ok && body.ok === true,
        message: response.ok
          ? "Health check passed"
          : `Health check failed (${response.status})`,
      });
    } catch (error) {
      checks.push({
        name: "Webhook endpoint",
        ok: false,
        message:
          error instanceof Error
            ? error.message
            : "Could not reach webhook endpoint",
      });
    }
  } else {
    checks.push({
      name: "Webhook endpoint",
      ok: false,
      message: "Skipped until TABOOLA_WEBHOOK_SECRET is configured",
    });
  }

  const ok = checks.every((check) => check.ok);

  return NextResponse.json({
    ok,
    webhookReachable,
    checks,
    config,
  });
}
