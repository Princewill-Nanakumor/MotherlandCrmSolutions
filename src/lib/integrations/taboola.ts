import mongoose from "mongoose";
import { parsePhoneNumberFromString } from "libphonenumber-js";
import { normalizeCountryInput } from "@/lib/countryNormalize";

export interface TaboolaLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  language: string;
  ip: string;
  clickId: string;
  page: string;
  campaignId: string;
}

export interface MappedTaboolaLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  comments: string;
  externalId: string;
  campaignId: string;
  metadata: {
    language: string;
    ip: string;
    clickId: string;
    page: string;
  };
}

function normalizeKeyMap(
  input: Record<string, unknown>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value == null) continue;
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    out[key.toLowerCase()] = trimmed;
  }
  return out;
}

function pick(map: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = map[key.toLowerCase()];
    if (value) return value;
  }
  return "";
}

export function parseTaboolaPayload(
  input: Record<string, unknown>,
): TaboolaLeadPayload {
  const map = normalizeKeyMap(input);
  return {
    firstName: pick(map, ["firstname", "first_name", "fname"]),
    lastName: pick(map, ["lastname", "last_name", "lname"]),
    email: pick(map, ["email", "e-mail"]),
    phone: pick(map, ["phonenumber", "phone", "phone_number", "mobile"]),
    country: pick(map, ["country", "countrycode", "country_code"]),
    language: pick(map, ["language", "lang"]),
    ip: pick(map, ["ip", "ipaddress", "ip_address"]),
    clickId: pick(map, ["clickid", "click_id", "click-id"]),
    page: pick(map, ["page", "funnel", "funnelpage", "landingpage", "url"]),
    campaignId: pick(map, [
      "campaignid",
      "campaign_id",
      "campaign",
      "campaigntoken",
    ]),
  };
}

function buildTaboolaComments(payload: TaboolaLeadPayload): string {
  const lines = ["Imported from Taboola."];
  if (payload.language) lines.push(`Language: ${payload.language}`);
  if (payload.ip) lines.push(`IP: ${payload.ip}`);
  if (payload.clickId) lines.push(`Click ID: ${payload.clickId}`);
  if (payload.page) lines.push(`Page: ${payload.page}`);
  if (payload.campaignId) lines.push(`Campaign: ${payload.campaignId}`);
  return lines.join("\n");
}

/** Use explicit Country from Taboola, else ISO region from E.164 phone when possible. */
function resolveTaboolaCountry(payload: TaboolaLeadPayload): string {
  const explicit = payload.country.trim();
  if (explicit) return normalizeCountryInput(explicit);

  const phone = payload.phone.trim();
  if (!phone) return "";

  try {
    const parsed = parsePhoneNumberFromString(phone);
    const fromPhone = parsed?.country?.trim() ?? "";
    return fromPhone ? normalizeCountryInput(fromPhone) : "";
  } catch {
    return "";
  }
}

export function mapTaboolaToLead(payload: TaboolaLeadPayload): MappedTaboolaLead {
  const email = payload.email.trim().toLowerCase();
  const externalId =
    payload.clickId.trim() || (email ? `email:${email}` : "");

  return {
    firstName: payload.firstName.trim() || "Unknown",
    lastName: payload.lastName.trim(),
    email,
    phone: payload.phone.trim(),
    country: resolveTaboolaCountry(payload),
    source: payload.page ? `Taboola - ${payload.page}` : "Taboola",
    comments: buildTaboolaComments(payload),
    externalId,
    campaignId: payload.campaignId.trim(),
    metadata: {
      language: payload.language.trim(),
      ip: payload.ip.trim(),
      clickId: payload.clickId.trim(),
      page: payload.page.trim(),
    },
  };
}

export function verifyTaboolaWebhookSecret(
  request: Request,
  url: URL,
): boolean {
  const expected = process.env.TABOOLA_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return process.env.NODE_ENV !== "production";
  }

  const headerSecret = request.headers.get("x-taboola-webhook-secret");
  if (headerSecret === expected) return true;

  const authorization = request.headers.get("authorization");
  if (authorization === `Bearer ${expected}`) return true;

  if (url.searchParams.get("secret") === expected) return true;

  return false;
}

function parseCampaignAdminMap(): Record<string, string> {
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
    console.error("Invalid TABOOLA_CAMPAIGN_ADMIN_MAP JSON");
    return {};
  }
}

export function resolveTaboolaAdminId(options: {
  campaignId?: string;
  explicitAdminId?: string;
}): string | null {
  const campaignMap = parseCampaignAdminMap();
  const campaignId = options.campaignId?.trim();
  if (campaignId && campaignMap[campaignId]) {
    return campaignMap[campaignId];
  }

  const allowedAdminIds = (
    process.env.TABOOLA_ALLOWED_ADMIN_IDS?.split(",") ?? []
  )
    .map((id) => id.trim())
    .filter((id) => mongoose.Types.ObjectId.isValid(id));

  const explicit = options.explicitAdminId?.trim();
  if (explicit && mongoose.Types.ObjectId.isValid(explicit)) {
    const defaultAdminId = process.env.TABOOLA_DEFAULT_ADMIN_ID?.trim();
    if (defaultAdminId && explicit === defaultAdminId) {
      return explicit;
    }
    if (allowedAdminIds.includes(explicit)) {
      return explicit;
    }
    return null;
  }

  const defaultAdminId = process.env.TABOOLA_DEFAULT_ADMIN_ID?.trim();
  if (defaultAdminId && mongoose.Types.ObjectId.isValid(defaultAdminId)) {
    return defaultAdminId;
  }

  return null;
}

export async function parseTaboolaRequestBody(
  request: Request,
): Promise<Record<string, unknown>> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const json = (await request.json()) as unknown;
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return json as Record<string, unknown>;
    }
    return {};
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    const out: Record<string, unknown> = {};
    form.forEach((value, key) => {
      out[key] = typeof value === "string" ? value : value.name;
    });
    return out;
  }

  const raw = await request.text();
  if (!raw.trim()) return {};

  try {
    const json = JSON.parse(raw) as unknown;
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return json as Record<string, unknown>;
    }
  } catch {
    // fall through to query-string style body
  }

  const params = new URLSearchParams(raw);
  const out: Record<string, unknown> = {};
  params.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}
