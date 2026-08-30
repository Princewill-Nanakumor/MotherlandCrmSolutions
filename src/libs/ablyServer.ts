import Ably from "ably";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  CALL_LOG_CREATED_EVENT,
  PAYMENT_NOTIFICATION_EVENT,
  REMINDER_DUE_EVENT,
  getSuperAdminNotificationsChannelName,
  getTenantChannelName,
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

async function publishOnTenantChannel(
  adminId: string,
  eventName: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(getTenantChannelName(adminId));
  await channel.publish(eventName, payload);
}

/**
 * Formerly published on `crm:admin:{id}:lead:{leadId}`.
 * Per-lead channels are gone — call sites already follow with
 * {@link publishAdminLeadsUpdatedEvent} on the tenant channel, so this is a
 * no-op to avoid double-publishing the same update.
 */
export async function publishLeadUpdatedEvent(
  _adminId: string,
  _leadId: string,
  _payload: Record<string, unknown>,
): Promise<void> {
  /* no-op — tenant channel covers panel + list via admin.leads.updated */
}

export type ReminderDueAblyPayload = {
  reminderId: string;
  /** Optional — clients refetch due list; id helps logging only. */
  leadId?: string;
};

/** Signal only — clients filter by userId then refetch due reminders from the API. */
export async function publishReminderDueEvent(
  adminId: string,
  userId: string,
  payload: ReminderDueAblyPayload,
): Promise<void> {
  await publishOnTenantChannel(adminId, REMINDER_DUE_EVENT, {
    reminderId: payload.reminderId,
    ...(payload.leadId ? { leadId: payload.leadId } : {}),
    userId,
  });
}

export async function publishCallLogCreatedEvent(
  adminId: string,
  userId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await publishOnTenantChannel(adminId, CALL_LOG_CREATED_EVENT, {
    ...payload,
    userId: (payload.userId as string | undefined) ?? userId,
  });
}

export async function publishAdminLeadsUpdatedEvent(
  adminId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await publishOnTenantChannel(adminId, ADMIN_LEADS_UPDATED_EVENT, payload);
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

/** Push payment notification on the tenant channel (clients filter by userId). */
export async function publishUserPaymentNotificationEvent(
  adminId: string,
  userId: string,
  payload: PaymentNotificationAblyPayload,
): Promise<void> {
  await publishOnTenantChannel(adminId, PAYMENT_NOTIFICATION_EVENT, {
    ...payload,
    userId,
  });
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
