import { describe, expect, it } from "vitest";
import { validateHeaders } from "./validation";
import { processTextData } from "./processors";

describe("CSV import validation", () => {
  it("flags missing required columns", () => {
    const result = validateHeaders(["email", "name"]);
    expect(result.missingFields.length).toBeGreaterThan(0);
    expect(result.missingFields).toEqual(
      expect.arrayContaining(["phone", "country"]),
    );
  });

  it("accepts valid header set", () => {
    const result = validateHeaders([
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "Country",
    ]);
    expect(result.missingFields).toEqual([]);
  });

  it("rejects CSV text missing required headers", async () => {
    await expect(
      processTextData("email,name\na@b.com,Ada Lovelace"),
    ).rejects.toMatchObject({ type: "MISSING_HEADERS" });
  });

  it("parses a minimal valid CSV", async () => {
    const csv = [
      "name,email,phone,country",
      "Ada Lovelace,ada@example.com,+15551234567,United States",
    ].join("\n");

    const leads = await processTextData(csv);
    expect(leads.length).toBe(1);
    expect(leads[0]).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      email: "ada@example.com",
    });
  });
});
