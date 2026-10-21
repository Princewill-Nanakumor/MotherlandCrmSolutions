import { describe, expect, it } from "vitest";
import { formatPersonName } from "@/lib/leadAssignmentDisplay";

describe("formatPersonName", () => {
  it("title-cases agent names in assign dropdowns", () => {
    expect(formatPersonName("john", "doe")).toBe("John Doe");
    expect(formatPersonName("MARY JANE", "watson")).toBe("Mary Jane Watson");
    expect(formatPersonName("ada", "LOVELACE")).toBe("Ada Lovelace");
  });
});
