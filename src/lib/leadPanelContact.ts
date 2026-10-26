import type { QueryClient } from "@tanstack/react-query";
import type { Lead, LeadContactEntry } from "@/types/leads";
import {
  isMaskedContactValue,
  maskEmail,
  maskPhone,
} from "@/lib/contactMasking";
import { maskContactEntries } from "@/lib/leadContactEntries";
import { mergeLeadContactExtras } from "@/lib/leadClientUpdate";

export type PanelContactSnapshot = {
  leadId: string;
  email: string;
  phone: string;
  emails: LeadContactEntry[];
  phones: LeadContactEntry[];
};

export function panelContactSnapshotFromLead(lead: Lead): PanelContactSnapshot {
  return {
    leadId: lead._id,
    email: lead.email,
    phone: lead.phone ?? "",
    emails: lead.emails ?? [],
    phones: lead.phones ?? [],
  };
}

/** Look up a single lead inside whatever shape leads-cache happens to be in. */
export function findLeadInQueryData(
  data: unknown,
  leadId: string,
): Lead | undefined {
  if (Array.isArray(data)) {
    return (data as Lead[]).find((l) => l?._id === leadId);
  }
  if (data && typeof data === "object") {
    const d = data as { data?: Lead[]; leads?: Lead[] };
    if (Array.isArray(d.data)) return d.data.find((l) => l?._id === leadId);
    if (Array.isArray(d.leads)) return d.leads.find((l) => l?._id === leadId);
  }
  return undefined;
}

/**
 * Apply unmasked panel contact onto a list/cache lead, then keep extras from
 * a richer in-panel lead when the incoming row omitted `emails`/`phones`.
 *
 * Snapshot email/phone are only used when the incoming values look masked
 * (agent list rows). Never overwrite a deliberate panel edit with the old
 * snapshot — that made "new primary + old primary as Email 2" look like a
 * duplicate of the still-stale primary.
 */
export function mergeLeadForPanel(
  incoming: Lead,
  snapshot: PanelContactSnapshot | null,
  richer?: Pick<Lead, "emails" | "phones"> | null,
): Lead {
  const withUnmasked =
    snapshot && snapshot.leadId === incoming._id
      ? {
          ...incoming,
          email: isMaskedContactValue(incoming.email)
            ? snapshot.email
            : incoming.email,
          phone: isMaskedContactValue(incoming.phone)
            ? snapshot.phone
            : (incoming.phone ?? ""),
          emails:
            incoming.emails !== undefined
              ? incoming.emails
              : snapshot.emails,
          phones:
            incoming.phones !== undefined
              ? incoming.phones
              : snapshot.phones,
        }
      : incoming;

  return mergeLeadContactExtras(withUnmasked, richer);
}

/** List-safe contact: respect agent canViewEmails / canViewPhoneNumbers. */
export function listSafeContact(
  contact: {
    email: string;
    phone: string;
    emails?: LeadContactEntry[];
    phones?: LeadContactEntry[];
  },
  canViewEmails: boolean,
  canViewPhoneNumbers: boolean,
) {
  const emails = contact.emails ?? [];
  const phones = contact.phones ?? [];
  return {
    email: canViewEmails
      ? contact.email
      : maskEmail(contact.email || "", false),
    phone: canViewPhoneNumbers
      ? contact.phone
      : maskPhone(contact.phone || "", false),
    emails: canViewEmails
      ? emails
      : maskContactEntries(emails, (value) => maskEmail(value, false)),
    phones: canViewPhoneNumbers
      ? phones
      : maskContactEntries(phones, (value) => maskPhone(value, false)),
  };
}

/** Keep list caches aligned with detail contact the viewer is allowed to see. */
export function mergeContactIntoListCaches(
  queryClient: QueryClient,
  leadId: string,
  contact: {
    email: string;
    phone: string;
    emails?: LeadContactEntry[];
    phones?: LeadContactEntry[];
  },
) {
  const patch = (old: unknown): unknown => {
    const apply = (l: Lead): Lead =>
      l._id === leadId
        ? {
            ...l,
            email: contact.email,
            phone: contact.phone,
            ...(contact.emails !== undefined
              ? { emails: contact.emails }
              : {}),
            ...(contact.phones !== undefined
              ? { phones: contact.phones }
              : {}),
          }
        : l;
    if (Array.isArray(old)) {
      return (old as Lead[]).map(apply);
    }
    if (
      old &&
      typeof old === "object" &&
      Array.isArray((old as { leads?: Lead[] }).leads)
    ) {
      const d = old as { leads: Lead[]; total?: number; totalAll?: number };
      return { ...d, leads: d.leads.map(apply) };
    }
    return old;
  };
  queryClient.setQueriesData(
    { predicate: (q) => q.queryKey[0] === "leads" },
    patch,
  );
  queryClient.setQueriesData(
    { predicate: (q) => q.queryKey[0] === "assignedLeads" },
    patch,
  );
}

/** Write detail contact into list caches, masked for the current viewer. */
export function syncLeadContactToListCaches(
  queryClient: QueryClient,
  lead: Lead,
  canViewEmails: boolean,
  canViewPhoneNumbers: boolean,
) {
  mergeContactIntoListCaches(
    queryClient,
    lead._id,
    listSafeContact(
      {
        email: lead.email,
        phone: lead.phone ?? "",
        emails: lead.emails ?? [],
        phones: lead.phones ?? [],
      },
      canViewEmails,
      canViewPhoneNumbers,
    ),
  );
}

/** Keep `["lead", id]` and optional alias id in sync. */
export function setLeadDetailQueryData(
  queryClient: QueryClient,
  lead: Lead,
) {
  queryClient.setQueryData(["lead", lead._id], lead);
  if (lead.id && lead.id !== lead._id) {
    queryClient.setQueryData(["lead", lead.id], lead);
  }
}
