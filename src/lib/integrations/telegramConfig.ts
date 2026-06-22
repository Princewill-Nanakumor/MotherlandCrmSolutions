import mongoose from "mongoose";
import { TABOOLA_PRODUCTION_ORIGIN } from "@/lib/integrations/taboolaConfig";

export function getTelegramAdminChatMap(): Record<string, string> {
  const raw = process.env.TELEGRAM_ADMIN_CHAT_MAP?.trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Record<string, string> = {};
    for (const [adminId, chatId] of Object.entries(parsed)) {
      if (
        typeof chatId === "string" &&
        mongoose.Types.ObjectId.isValid(adminId.trim()) &&
        chatId.trim()
      ) {
        out[adminId.trim()] = chatId.trim();
      }
    }
    return out;
  } catch {
    console.error("Invalid TELEGRAM_ADMIN_CHAT_MAP JSON");
    return {};
  }
}

export function getTelegramConfigSnapshot() {
  const botTokenConfigured = Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
  const defaultChatId = process.env.TELEGRAM_DEFAULT_CHAT_ID?.trim() ?? "";
  const defaultChatConfigured = Boolean(defaultChatId);
  const adminChatMap = getTelegramAdminChatMap();
  const defaultAdminId =
    process.env.TELEGRAM_DEFAULT_ADMIN_ID?.trim() ||
    process.env.TABOOLA_DEFAULT_ADMIN_ID?.trim() ||
    "";
  const defaultAdminConfigured = mongoose.Types.ObjectId.isValid(defaultAdminId);

  return {
    botTokenConfigured,
    defaultChatConfigured,
    defaultAdminConfigured,
    defaultAdminId: defaultAdminConfigured ? defaultAdminId : null,
    adminChatMappingsCount: Object.keys(adminChatMap).length,
    ready:
      botTokenConfigured &&
      (defaultChatConfigured || Object.keys(adminChatMap).length > 0),
  };
}

export function resolveTelegramChatId(adminId: string): string | null {
  if (!mongoose.Types.ObjectId.isValid(adminId)) return null;

  const trimmedAdminId = adminId.trim();
  const adminChatMap = getTelegramAdminChatMap();
  if (adminChatMap[trimmedAdminId]) {
    return adminChatMap[trimmedAdminId];
  }

  const defaultChatId = process.env.TELEGRAM_DEFAULT_CHAT_ID?.trim();
  if (!defaultChatId) return null;

  const defaultAdminId =
    process.env.TELEGRAM_DEFAULT_ADMIN_ID?.trim() ||
    process.env.TABOOLA_DEFAULT_ADMIN_ID?.trim();

  if (defaultAdminId === trimmedAdminId) {
    return defaultChatId;
  }

  return null;
}

export function adminHasTelegramNotifications(adminId: string): boolean {
  return resolveTelegramChatId(adminId) !== null;
}

export function getCrmLeadUrl(leadRef: {
  _id: string;
  leadId?: string;
}): string {
  const origin =
    process.env.CANONICAL_APP_URL?.trim()?.replace(/\/$/, "") ||
    TABOOLA_PRODUCTION_ORIGIN;
  const leadParam = leadRef.leadId?.trim() || leadRef._id;
  return `${origin}/dashboard/all-leads?lead=${encodeURIComponent(leadParam)}`;
}
