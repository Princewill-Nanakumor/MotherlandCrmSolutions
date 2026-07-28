import Ably from "ably";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  CALL_LOG_CREATED_EVENT,
  LEAD_UPDATED_EVENT,
  PAYMENT_NOTIFICATION_EVENT,
  REMINDER_DUE_EVENT,
  getAdminLeadsChannelName,
  getLeadChannelName,
  getSuperAdminNotificationsChannelName,
  getUserCallLogsChannelName,
  getUserNotificationsChannelName,
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

export type PaymentNotificationAblyPayload = {
  type:
    | "PAYMENT_APPROVED"
    | "PAYMENT_REJECTED"
    | "PAYMENT_PENDING_APPROVAL";
  paymentId: string;
  amount?: number;
  currency?: string;
};

/** Push payment notification to a specific user (tenant admin depositor). */
export async function publishUserPaymentNotificationEvent(
  adminId: string,
  userId: string,
  payload: PaymentNotificationAblyPayload,
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(
    getUserNotificationsChannelName(adminId, userId),
  );
  await channel.publish(PAYMENT_NOTIFICATION_EVENT, payload);
}

/** Push pending-approval alerts to all connected super admins. */
export async function publishSuperAdminPaymentNotificationEvent(
  payload: PaymentNotificationAblyPayload,
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(getSuperAdminNotificationsChannelName());
  await channel.publish(PAYMENT_NOTIFICATION_EVENT, payload);
}
