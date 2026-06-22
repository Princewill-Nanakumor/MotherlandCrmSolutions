import {
  getCrmLeadUrl,
  getTelegramConfigSnapshot,
  resolveTelegramChatId,
} from "@/lib/integrations/telegramConfig";

function escapeTelegramHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function formatInboundLeadTelegramMessage(input: {
  provider: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  leadId?: string;
  leadRef?: { _id: string; leadId?: string };
}): string {
  const name = [input.firstName, input.lastName].filter(Boolean).join(" ").trim();
  const providerLabel =
    input.provider === "taboola" ? "Taboola" : input.provider;
  const lines = [
    `🆕 <b>New ${escapeTelegramHtml(providerLabel)} lead</b>`,
    name ? `<b>Name:</b> ${escapeTelegramHtml(name)}` : null,
    `<b>Email:</b> ${escapeTelegramHtml(input.email)}`,
    input.phone ? `<b>Phone:</b> ${escapeTelegramHtml(input.phone)}` : null,
    input.country ? `<b>Country:</b> ${escapeTelegramHtml(input.country)}` : null,
    input.source
      ? `<b>Source:</b> ${escapeTelegramHtml(input.source)}`
      : null,
  ].filter(Boolean);

  if (input.leadRef) {
    lines.push(
      `<a href="${escapeTelegramHtml(getCrmLeadUrl(input.leadRef))}">Open in CRM</a>`,
    );
  }

  return lines.join("\n");
}

export async function sendTelegramMessage(
  chatId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }
  if (!chatId.trim()) {
    return { ok: false, error: "Telegram chat ID is missing" };
  }

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );

    const body = (await response.json().catch(() => ({}))) as {
      ok?: boolean;
      description?: string;
    };

    if (!response.ok || body.ok === false) {
      return {
        ok: false,
        error: body.description ?? `Telegram API error (${response.status})`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Telegram request failed",
    };
  }
}

export async function notifyInboundLeadTelegram(input: {
  adminId: string;
  provider: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  leadRef: { _id: string; leadId?: string };
}): Promise<boolean> {
  const snapshot = getTelegramConfigSnapshot();
  if (!snapshot.ready) return false;

  const chatId = resolveTelegramChatId(input.adminId);
  if (!chatId) return false;

  const text = formatInboundLeadTelegramMessage({
    ...input,
    leadRef: input.leadRef,
  });

  const result = await sendTelegramMessage(chatId, text);
  if (!result.ok) {
    console.error("Telegram lead notification failed:", result.error);
    return false;
  }

  return true;
}

export async function sendTelegramTestMessage(
  adminId: string,
): Promise<{ ok: boolean; error?: string }> {
  const chatId = resolveTelegramChatId(adminId);
  if (!chatId) {
    return {
      ok: false,
      error:
        "No Telegram chat configured for your admin account. Set TELEGRAM_DEFAULT_CHAT_ID or TELEGRAM_ADMIN_CHAT_MAP on the server.",
    };
  }

  return sendTelegramMessage(
    chatId,
    "✅ <b>Motherland CRM</b>\nTelegram lead alerts are working. You will receive a message here when new Taboola leads arrive.",
  );
}
