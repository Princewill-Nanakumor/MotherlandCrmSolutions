import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/apiResponses";
import { sendTelegramTestMessage } from "@/lib/integrations/telegram";
import {
  adminHasTelegramNotifications,
  getTelegramConfigSnapshot,
} from "@/lib/integrations/telegramConfig";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }
  if (session.user.role !== "ADMIN") {
    return forbiddenResponse("Admin access required");
  }

  const config = getTelegramConfigSnapshot();
  const checks: Array<{ name: string; ok: boolean; message: string }> = [];

  checks.push({
    name: "Bot token",
    ok: config.botTokenConfigured,
    message: config.botTokenConfigured
      ? "TELEGRAM_BOT_TOKEN is configured"
      : "Set TELEGRAM_BOT_TOKEN on the server",
  });

  checks.push({
    name: "Chat routing",
    ok:
      config.defaultChatConfigured || config.adminChatMappingsCount > 0,
    message:
      config.defaultChatConfigured || config.adminChatMappingsCount > 0
        ? "Telegram chat ID is configured"
        : "Set TELEGRAM_DEFAULT_CHAT_ID or TELEGRAM_ADMIN_CHAT_MAP",
  });

  const receivesForAdmin = adminHasTelegramNotifications(session.user.id);
  checks.push({
    name: "Your admin account",
    ok: receivesForAdmin,
    message: receivesForAdmin
      ? "This admin account is mapped to a Telegram chat"
      : "Map your admin ID to a chat via TELEGRAM_DEFAULT_CHAT_ID + TABOOLA_DEFAULT_ADMIN_ID, or TELEGRAM_ADMIN_CHAT_MAP",
  });

  if (!config.ready || !receivesForAdmin) {
    return NextResponse.json({
      ok: false,
      checks,
      config,
    });
  }

  const result = await sendTelegramTestMessage(session.user.id);
  checks.push({
    name: "Test message",
    ok: result.ok,
    message: result.ok
      ? "Test notification sent to your Telegram chat"
      : (result.error ?? "Failed to send test message"),
  });

  return NextResponse.json({
    ok: checks.every((check) => check.ok),
    checks,
    config,
  });
}
