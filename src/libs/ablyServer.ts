import Ably from "ably";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  CALL_LOG_CREATED_EVENT,
  LEAD_UPDATED_EVENT,
  REMINDER_DUE_EVENT,
  getAdminLeadsChannelName,
  getLeadChannelName,
  getUserCallLogsChannelName,
  getUserRemindersChannelName,
} from "@/libs/realtime";

let ablyRestClient: Ably.Rest | null = null;

function getAblyRestClient(): Ably.Rest | null {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) return null;

  if (!ablyRestClient) {
    ablyRestClient = new Ably.Rest(apiKey);
  }

  return ablyRestClient;
}

export async function publishLeadUpdatedEvent(
  adminId: string,
  leadId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(getLeadChannelName(adminId, leadId));
  await channel.publish(LEAD_UPDATED_EVENT, payload);
}

export async function publishReminderDueEvent(
  adminId: string,
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(getUserRemindersChannelName(adminId, userId));
  await channel.publish(REMINDER_DUE_EVENT, payload);
}

export async function publishCallLogCreatedEvent(
  adminId: string,
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(getUserCallLogsChannelName(adminId, userId));
  await channel.publish(CALL_LOG_CREATED_EVENT, payload);
}

export async function publishAdminLeadsUpdatedEvent(
  adminId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(getAdminLeadsChannelName(adminId));
  await channel.publish(ADMIN_LEADS_UPDATED_EVENT, payload);
}
