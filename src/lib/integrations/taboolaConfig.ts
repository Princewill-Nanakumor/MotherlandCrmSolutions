import mongoose from "mongoose";
import {
  getPublicAppOrigin,
  isProductionDeployment,
} from "@/lib/emailAuthBranding";

/** Public CRM domain Taboola should always POST to (not Netlify branch URLs). */
export const TABOOLA_PRODUCTION_ORIGIN =
  process.env.CANONICAL_APP_URL?.trim()?.replace(/\/$/, "") ||
  "https://motherlandcrmsolutions.com";

function isLocalOrigin(origin: string): boolean {
  return (
    origin === "http://localhost:3000" ||
    origin.startsWith("http://127.0.0.1")
  );
}

function isNetlifyBranchOrigin(origin: string): boolean {
  try {
    return new URL(origin).hostname.endsWith(".netlify.app");
  } catch {
    return false;
  }
}

export function getTaboolaWebhookPath(): string {
  return "/api/integrations/taboola/leads";
}

/**
 * Taboola must always receive the public CRM URL (custom domain), never a Netlify
 * branch hostname from NEXTAUTH_URL or the incoming request.
 */
export function resolveTaboolaWebhookOrigin(): string {
  const explicitBase = process.env.TABOOLA_WEBHOOK_BASE_URL?.trim();
  if (explicitBase) {
    return explicitBase.replace(/\/$/, "");
  }

  const configured = getPublicAppOrigin().replace(/\/$/, "");

  if (!isProductionDeployment()) {
    return configured;
  }

  if (isLocalOrigin(configured) || isNetlifyBranchOrigin(configured)) {
    return TABOOLA_PRODUCTION_ORIGIN;
  }

  const canonicalEnv = process.env.CANONICAL_APP_URL?.trim()?.replace(/\/$/, "");
  if (canonicalEnv && !isNetlifyBranchOrigin(canonicalEnv)) {
    return canonicalEnv;
  }

  return TABOOLA_PRODUCTION_ORIGIN;
}

export function getTaboolaWebhookUrl(): string {
  const base = resolveTaboolaWebhookOrigin();
  return `${base}${getTaboolaWebhookPath()}`;
}

/** Normalize API responses that may still contain a Netlify deploy hostname. */
export function sanitizeTaboolaWebhookUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.endsWith(".netlify.app")) {
      return `${TABOOLA_PRODUCTION_ORIGIN}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    // keep original
  }
  return url;
}

export function getTaboolaCampaignAdminMap(): Record<string, string> {
  const raw = process.env.TABOOLA_CAMPAIGN_ADMIN_MAP?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "string" && mongoose.Types.ObjectId.isValid(value)) {
        out[key.trim()] = value.trim();
      }
    }
    return out;
  } catch {
    return {};
  }
}

export function getTaboolaConfigSnapshot() {
  const secretConfigured = Boolean(process.env.TABOOLA_WEBHOOK_SECRET?.trim());
  const defaultAdminId = process.env.TABOOLA_DEFAULT_ADMIN_ID?.trim() ?? "";
  const defaultAdminConfigured = mongoose.Types.ObjectId.isValid(defaultAdminId);
  const campaignMap = getTaboolaCampaignAdminMap();
  const allowedAdminIds = (
    process.env.TABOOLA_ALLOWED_ADMIN_IDS?.split(",") ?? []
  )
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  return {
    secretConfigured,
    defaultAdminId: defaultAdminConfigured ? defaultAdminId : null,
    defaultAdminConfigured,
    campaignMappingsCount: Object.keys(campaignMap).length,
    allowedAdminIdsCount: allowedAdminIds.length,
    multiTenantEnabled:
      allowedAdminIds.length > 0 || Object.keys(campaignMap).length > 0,
    ready:
      secretConfigured &&
      (defaultAdminConfigured || Object.keys(campaignMap).length > 0),
  };
}

export type TaboolaRoutingMode =
  | "default_admin"
  | "campaign_map"
  | "explicit_admin_url";

export interface TaboolaTenantStatus {
  receivesLeadsForThisAdmin: boolean;
  isDefaultTaboolaAdmin: boolean;
  hasCampaignRouting: boolean;
  hasDedicatedAdminUrl: boolean;
  routingMode: TaboolaRoutingMode | null;
  /** URL this admin should give Taboola, or null if not their integration */
  webhookUrlForAdmin: string | null;
  canShareWithTaboola: boolean;
  multiTenantNote: string;
}

export function getTaboolaTenantStatus(
  adminId: string,
): TaboolaTenantStatus {
  const snapshot = getTaboolaConfigSnapshot();
  const baseUrl = getTaboolaWebhookUrl();
  const campaignMap = getTaboolaCampaignAdminMap();
  const allowedAdminIds = (
    process.env.TABOOLA_ALLOWED_ADMIN_IDS?.split(",") ?? []
  )
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const isDefaultTaboolaAdmin = snapshot.defaultAdminId === adminId;
  const hasCampaignRouting = Object.values(campaignMap).includes(adminId);
  const hasDedicatedAdminUrl = allowedAdminIds.includes(adminId);

  const receivesLeadsForThisAdmin =
    isDefaultTaboolaAdmin || hasCampaignRouting || hasDedicatedAdminUrl;

  let routingMode: TaboolaRoutingMode | null = null;
  if (isDefaultTaboolaAdmin) {
    routingMode = "default_admin";
  } else if (hasCampaignRouting) {
    routingMode = "campaign_map";
  } else if (hasDedicatedAdminUrl) {
    routingMode = "explicit_admin_url";
  }

  let webhookUrlForAdmin: string | null = null;
  if (isDefaultTaboolaAdmin) {
    webhookUrlForAdmin = baseUrl;
  } else if (hasDedicatedAdminUrl) {
    webhookUrlForAdmin = `${baseUrl}?adminId=${encodeURIComponent(adminId)}`;
  } else if (hasCampaignRouting) {
    webhookUrlForAdmin = baseUrl;
  }

  const canShareWithTaboola =
    receivesLeadsForThisAdmin && snapshot.secretConfigured;

  let multiTenantNote: string;
  if (!snapshot.secretConfigured) {
    multiTenantNote =
      "Taboola is not configured on the server yet. Only the platform operator can enable it.";
  } else if (!receivesLeadsForThisAdmin) {
    multiTenantNote =
      "Taboola is configured for a different admin account. Leads sent with the shared endpoint will not appear in your All Leads. Do not reuse another tenant's webhook details.";
  } else if (isDefaultTaboolaAdmin) {
    multiTenantNote = snapshot.multiTenantEnabled
      ? "You are the primary Taboola admin. Other admins may have their own campaign or URL routing configured separately."
      : "You are the only admin receiving Taboola leads. Other admins on this CRM cannot use your webhook.";
  } else if (hasDedicatedAdminUrl) {
    multiTenantNote =
      "Use your personal webhook URL below (includes your admin ID). Do not share it with other admins.";
  } else {
    multiTenantNote =
      "Leads are routed to you by Taboola campaign ID. Ask your Taboola manager to use the campaign mapping configured for your account.";
  }

  return {
    receivesLeadsForThisAdmin,
    isDefaultTaboolaAdmin,
    hasCampaignRouting,
    hasDedicatedAdminUrl,
    routingMode,
    webhookUrlForAdmin,
    canShareWithTaboola,
    multiTenantNote,
  };
}

export function adminReceivesTaboolaLeads(adminId: string): boolean {
  if (!mongoose.Types.ObjectId.isValid(adminId)) return false;
  const snapshot = getTaboolaConfigSnapshot();
  if (snapshot.defaultAdminId === adminId) return true;

  const allowed = (
    process.env.TABOOLA_ALLOWED_ADMIN_IDS?.split(",") ?? []
  )
    .map((id) => id.trim())
    .filter(Boolean);
  if (allowed.includes(adminId)) return true;

  const campaignMap = getTaboolaCampaignAdminMap();
  return Object.values(campaignMap).includes(adminId);
}

export const TABOOLA_FIELD_MAPPING = [
  { taboola: "FirstName", crm: "firstName", shownIn: "All Leads → Name" },
  { taboola: "LastName", crm: "lastName", shownIn: "All Leads → Name" },
  { taboola: "Email", crm: "email", shownIn: "All Leads → Email" },
  { taboola: "PhoneNumber", crm: "phone", shownIn: "All Leads → Phone" },
  { taboola: "Country", crm: "country", shownIn: "All Leads → Country (US/United States normalized)" },
  { taboola: "Language", crm: "comments", shownIn: "Stored on lead (details)" },
  { taboola: "IP", crm: "comments", shownIn: "Stored on lead (details)" },
  { taboola: "ClickID", crm: "idempotency + comments", shownIn: "Dedupes retries" },
  { taboola: "Page", crm: "source + comments", shownIn: "All Leads → Source" },
] as const;
