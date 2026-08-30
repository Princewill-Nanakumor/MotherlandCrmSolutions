/**
 * Realtime channel / event names.
 *
 * Architecture: one Ably channel per tenant (`crm:tenant:{adminId}`).
 * Typed events share that channel; clients filter by payload (leadId, userId).
 * Super-admin payment alerts stay on a separate cross-tenant channel.
 */

export const LEAD_UPDATED_EVENT = "lead.updated";
export const REMINDER_DUE_EVENT = "reminder.due";
export const CALL_LOG_CREATED_EVENT = "call-log.created";
/** Primary event for lead list / panel / bulk sync on the tenant channel. */
export const ADMIN_LEADS_UPDATED_EVENT = "admin.leads.updated";
export const PAYMENT_NOTIFICATION_EVENT = "payment.notification";

/** One realtime room per tenant — prefer this everywhere. */
export function getTenantChannelName(adminId: string): string {
  return `crm:tenant:${adminId}`;
}

/**
 * @deprecated Alias of {@link getTenantChannelName}. Kept so older call sites compile.
 */
export function getAdminLeadsChannelName(adminId: string): string {
  return getTenantChannelName(adminId);
}

/**
 * @deprecated Per-lead channels removed — all traffic uses the tenant channel.
 * Returns the tenant channel so stragglers do not create new channel names.
 */
export function getLeadChannelName(adminId: string, _leadId: string): string {
  return getTenantChannelName(adminId);
}

/**
 * @deprecated User reminder channels folded into the tenant channel.
 */
export function getUserRemindersChannelName(
  adminId: string,
  _userId: string,
): string {
  return getTenantChannelName(adminId);
}

/**
 * @deprecated User call-log channels folded into the tenant channel.
 */
export function getUserCallLogsChannelName(
  adminId: string,
  _userId: string,
): string {
  return getTenantChannelName(adminId);
}

/**
 * @deprecated User notification channels folded into the tenant channel.
 */
export function getUserNotificationsChannelName(
  adminId: string,
  _userId: string,
): string {
  return getTenantChannelName(adminId);
}

/** Broadcast channel for super-admin payment approval alerts. */
export function getSuperAdminNotificationsChannelName(): string {
  return "crm:super-admin:notifications";
}
