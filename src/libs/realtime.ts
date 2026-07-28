export const LEAD_UPDATED_EVENT = "lead.updated";
export const REMINDER_DUE_EVENT = "reminder.due";
export const CALL_LOG_CREATED_EVENT = "call-log.created";
export const ADMIN_LEADS_UPDATED_EVENT = "admin.leads.updated";
export const PAYMENT_NOTIFICATION_EVENT = "payment.notification";

export function getLeadChannelName(adminId: string, leadId: string): string {
  return `crm:admin:${adminId}:lead:${leadId}`;
}

export function getUserRemindersChannelName(
  adminId: string,
  userId: string,
): string {
  return `crm:admin:${adminId}:user:${userId}:reminders`;
}

export function getUserCallLogsChannelName(
  adminId: string,
  userId: string,
): string {
  return `crm:admin:${adminId}:user:${userId}:call-logs`;
}

export function getUserNotificationsChannelName(
  adminId: string,
  userId: string,
): string {
  return `crm:admin:${adminId}:user:${userId}:notifications`;
}

/** Broadcast channel for super-admin payment approval alerts. */
export function getSuperAdminNotificationsChannelName(): string {
  return "crm:super-admin:notifications";
}

export function getAdminLeadsChannelName(adminId: string): string {
  return `crm:admin:${adminId}:leads`;
}
