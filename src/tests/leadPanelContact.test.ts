import { describe, expect, it } from "vitest";
import {
  listSafeContact,
  mergeLeadForPanel,
  panelContactSnapshotFromLead,
} from "@/lib/leadPanelContact";
import type { Lead } from "@/types/leads";

const baseLead = {
  _id: "lead-1",
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.com",
  phone: "+15551234567",
  source: "web",
  status: "NEW",
} as unknown as Lead;

describe("leadPanelContact", () => {
  it("preserves unmasked extras from snapshot when list row omits them", () => {
    const snapshot = panelContactSnapshotFromLead({
      ...baseLead,
      emails: [{ value: "work@example.com", label: "Work" }],
      phones: [{ value: "+15559876543" }],
    });

    expect(mergeLeadForPanel(baseLead, snapshot)).toEqual({
      ...baseLead,
      email: snapshot.email,
      phone: snapshot.phone,
      emails: snapshot.emails,
      phones: snapshot.phones,
    });
  });

  it("masks list-safe contact when viewer cannot see PII", () => {
    const safe = listSafeContact(
      {
        email: "ada@example.com",
        phone: "+15551234567",
        emails: [{ value: "work@example.com" }],
        phones: [{ value: "+15559876543" }],
      },
      false,
      false,
    );

    expect(safe.email).toContain("•••");
    expect(safe.phone).toContain("•");
    expect(safe.emails[0]?.value).toContain("•••");
    expect(safe.phones[0]?.value).toContain("•");
  });
});
