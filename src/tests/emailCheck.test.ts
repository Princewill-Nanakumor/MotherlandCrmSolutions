import { describe, expect, it } from "vitest";
import {
  classifySheetEmails,
  getEmailCheckLimitError,
  MAX_EMAILS_PER_CHECK,
  normalizeCheckEmail,
} from "@/lib/emailCheck";
import { findMatchingHeader } from "@/utils/helper";

const isValid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

describe("emailCheck", () => {
  it("normalizes emails", () => {
    expect(normalizeCheckEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });

  it("dedupes and separates invalid emails", () => {
    const result = classifySheetEmails(
      [
        "a@example.com",
        "A@Example.com",
        "bad",
        "",
        "  ",
        "b@example.com",
        "not-an-email",
        "b@example.com",
      ],
      isValid,
    );

    expect(result.uniqueEmails).toEqual([
      "a@example.com",
      "b@example.com",
    ]);
    expect(result.invalid).toEqual(["bad", "not-an-email"]);
    expect(result.duplicateInSheet).toBe(2);
    expect(result.duplicates).toEqual([
      { email: "a@example.com", count: 2 },
      { email: "b@example.com", count: 2 },
    ]);
  });

  it("enforces the per-check cap", () => {
    expect(getEmailCheckLimitError(10)).toBeNull();
    expect(getEmailCheckLimitError(MAX_EMAILS_PER_CHECK + 1)).toMatch(
      /at most/,
    );
  });

  it("matches Email, Emails, and Email address headers", () => {
    expect(findMatchingHeader(["Emails"], "email")).toBe("Emails");
    expect(findMatchingHeader(["EMAILS"], "email")).toBe("EMAILS");
    expect(findMatchingHeader(["Email"], "email")).toBe("Email");
    expect(findMatchingHeader(["Email address"], "email")).toBe(
      "Email address",
    );
    expect(findMatchingHeader(["Name", "Phone"], "email")).toBeUndefined();
  });
});
