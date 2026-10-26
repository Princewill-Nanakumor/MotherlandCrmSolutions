import { describe, expect, it } from "vitest";
import {
  diffLeadContactChanges,
  summarizeLeadContactUpdateDetails,
} from "@/lib/leadContactUpdateActivity";

describe("diffLeadContactChanges", () => {
  it("diffs scalar contact fields present on the update payload", () => {
    const changes = diffLeadContactChanges(
      {
        firstName: "Shane",
        lastName: "Diane",
        email: "shanediane1@gmail.com",
        phone: "353894792905",
        country: "Ireland",
        source: "Manual Entry",
      },
      {
        firstName: "Sean",
        email: "sean.chidley@yahoomail.com",
        country: "United Kingdom",
      },
    );

    expect(changes).toEqual([
      {
        field: "First name",
        oldValue: "Shane",
        newValue: "Sean",
      },
      {
        field: "Email",
        oldValue: "shanediane1@gmail.com",
        newValue: "sean.chidley@yahoomail.com",
      },
      {
        field: "Country",
        oldValue: "Ireland",
        newValue: "United Kingdom",
      },
    ]);
  });

  it("records added and removed secondary emails/phones", () => {
    const changes = diffLeadContactChanges(
      {
        email: "primary@example.com",
        emails: [],
        phones: [{ value: "+15550001111", label: "Work" }],
      },
      {
        email: "primary@example.com",
        emails: [{ value: "second@example.com" }],
        phones: [],
      },
    );

    expect(changes).toEqual([
      {
        field: "Email 2",
        oldValue: null,
        newValue: "second@example.com",
      },
      {
        field: "Phone (Work)",
        oldValue: "+15550001111 (Work)",
        newValue: null,
      },
    ]);
  });
});

describe("summarizeLeadContactUpdateDetails", () => {
  it("summarizes single and multi-field updates", () => {
    expect(
      summarizeLeadContactUpdateDetails([
        { field: "Email 2", oldValue: null, newValue: "a@b.com" },
      ]),
    ).toBe("Added email 2");

    expect(
      summarizeLeadContactUpdateDetails([
        { field: "Email", oldValue: "a@b.com", newValue: "c@d.com" },
        { field: "Phone", oldValue: "1", newValue: "2" },
      ]),
    ).toBe("Updated contact information (2 changes)");
  });
});
