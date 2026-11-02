import type { Lead } from "@/types/leads";
import {
  isLegacyNumericLeadId,
  isPrefixedLeadId,
  normalizeLeadId,
} from "@/lib/leadId";

/** Whether a lead row matches the URL `lead` query value (_id or leadId). */
export function leadMatchesUrlParam(
  lead: Pick<Lead, "_id" | "leadId">,
  leadIdParam: string,
): boolean {
  if (!leadIdParam) return false;
  if (lead._id === leadIdParam) return true;

  if (isLegacyNumericLeadId(leadIdParam)) {
    const numericId = parseInt(leadIdParam, 10);
    return normalizeLeadId(lead.leadId) === normalizeLeadId(numericId);
  }

  if (isPrefixedLeadId(leadIdParam)) {
    return (
      normalizeLeadId(lead.leadId).toUpperCase() === leadIdParam.toUpperCase()
    );
  }

  return false;
}

export function findLeadByUrlParam(
  leads: Lead[],
  leadIdParam: string,
): Lead | undefined {
  if (!leadIdParam || leads.length === 0) return undefined;
  return leads.find((lead) => leadMatchesUrlParam(lead, leadIdParam));
}
