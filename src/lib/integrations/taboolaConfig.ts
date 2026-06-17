import mongoose from "mongoose";

export function getTaboolaWebhookPath(): string {
  return "/api/integrations/taboola/leads";
}

export function getTaboolaWebhookUrl(origin: string): string {
  const base = origin.replace(/\/$/, "");
  return `${base}${getTaboolaWebhookPath()}`;
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
    ready:
      secretConfigured &&
      (defaultAdminConfigured || Object.keys(campaignMap).length > 0),
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
  { taboola: "Language", crm: "comments", shownIn: "Stored on lead (details)" },
  { taboola: "IP", crm: "comments", shownIn: "Stored on lead (details)" },
  { taboola: "ClickID", crm: "idempotency + comments", shownIn: "Dedupes retries" },
  { taboola: "Page", crm: "source + comments", shownIn: "All Leads → Source" },
] as const;
