export const LEAD_UPDATED_EVENT = "lead.updated";

export function getLeadChannelName(adminId: string, leadId: string): string {
  return `crm:admin:${adminId}:lead:${leadId}`;
}
