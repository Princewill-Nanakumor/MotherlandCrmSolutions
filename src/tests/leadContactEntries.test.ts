import { describe, expect, it } from "vitest";
import {
  normalizeEmailEntries,
  normalizePhoneEntries,
  coerceContactEntries,
  MAX_LEAD_CONTACT_EXTRAS,
} from "@/lib/leadContactEntries";

describe("leadContactEntries", () => {
  it("coerces missing arrays to empty", () => {
    expect(coerceContactEntries(undefined)).toEqual([]);
    expect(coerceContactEntries(null)).toEqual([]);
  });

  it("normalizes secondary emails and rejects duplicates of primary", () => {
    const result = normalizeEmailEntries(
      [{ value: "Work@Example.com", label: " Work " }],
      "primary@example.com",
    );
    expect(result).toEqual([{ value: "work@example.com", label: "Work" }]);

    expect(() =>
      normalizeEmailEntries(
        [{ value: "primary@example.com" }],
        "primary@example.com",
      ),
    ).toThrow(/already the primary email/i);
  });

  it("allows the former primary as a secondary after the primary changes", () => {
    expect(
      normalizeEmailEntries(
        [{ value: "shanediane1@gmail.com" }],
        "Sean.chidley@yahoomail.com",
      ),
    ).toEqual([{ value: "shanediane1@gmail.com" }]);
  });

  it("normalizes secondary phones and rejects digit duplicates", () => {
    const result = normalizePhoneEntries(
      [{ value: "+1 (555) 000-1111", label: "Mobile" }],
      "+15550002222",
    );
    expect(result).toEqual([
      { value: "+1 (555) 000-1111", label: "Mobile" },
    ]);

    expect(() =>
      normalizePhoneEntries([{ value: "+1 555 000 2222" }], "+15550002222"),
    ).toThrow(/Duplicate phone/i);
  });

  it("enforces max extras", () => {
    const many = Array.from({ length: MAX_LEAD_CONTACT_EXTRAS + 1 }, (_, i) => ({
      value: `extra${i}@example.com`,
    }));
    expect(() => normalizeEmailEntries(many, "a@b.com")).toThrow(/At most/i);
  });
});
