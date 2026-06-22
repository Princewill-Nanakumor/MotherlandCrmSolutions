import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/auth";
import { forbiddenResponse, unauthorizedResponse } from "@/lib/apiResponses";
import { adminReceivesTaboolaLeads } from "@/lib/integrations/taboolaConfig";
import {
  adminHasTelegramNotifications,
  getTelegramConfigSnapshot,
} from "@/lib/integrations/telegramConfig";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }
  if (session.user.role !== "ADMIN") {
    return forbiddenResponse("Admin access required");
  }

  const config = getTelegramConfigSnapshot();
  const receivesForAdmin = adminHasTelegramNotifications(session.user.id);
  const receivesTaboola = adminReceivesTaboolaLeads(session.user.id);

  return NextResponse.json({
    provider: "telegram",
    config,
    receivesNotificationsForThisAdmin: receivesForAdmin,
    receivesTaboolaLeads: receivesTaboola,
    setupNote: config.ready
      ? receivesForAdmin
        ? "New inbound leads (e.g. Taboola) will be sent to your Telegram chat."
        : "Telegram is configured on the server but not mapped to your admin account yet."
      : "Ask your platform operator to set TELEGRAM_BOT_TOKEN and TELEGRAM_DEFAULT_CHAT_ID (or TELEGRAM_ADMIN_CHAT_MAP).",
  });
}
