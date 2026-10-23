import { describe, expect, it } from "vitest";
import { validateHeaders } from "@/utils/validation";
import { processTextData } from "@/utils/processors";

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

  it("accepts Full Name and Phone number variants", () => {
    const result = validateHeaders([
      "Full Name",
      "Email Address",
      "Phone number",
      "Country",
    ]);
    expect(result.missingFields).toEqual([]);
  });

  it("accepts mixed first-letter casings", () => {
    const result = validateHeaders([
      "full name",
      "email Address",
      "Phone",
      "country",
    ]);
    expect(result.missingFields).toEqual([]);
  });

  it("accepts Email / Email address / Emaill Address variants", () => {
    for (const emailHeader of [
      "email",
      "Email",
      "email Address",
      "Email address",
      "Email Address",
      "Emaill Address",
    ]) {
      const result = validateHeaders([
        "Full Name",
        emailHeader,
        "Phone",
        "Country",
      ]);
      expect(result.missingFields).toEqual([]);
    }
  });

  it("accepts Full name with Excel NBSP in headers", () => {
    const result = validateHeaders([
      "Full\u00A0name",
      "Email",
      "Phone\u00A0Number",
      "Country",
    ]);
    expect(result.missingFields).toEqual([]);
  });

  it("does not treat First Name alone as a complete name", () => {
    const result = validateHeaders([
      "First Name",
      "Email",
      "Phone",
      "Country",
    ]);
    expect(result.missingFields).toContain("name");
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

  it("parses CSV with Full Name and Phone number headers", async () => {
    const csv = [
      "Full Name,Email Address,Phone number,Country",
      "Ada Lovelace,ada@example.com,+15551234567,United States",
    ].join("\n");

    const leads = await processTextData(csv);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "+15551234567",
    });
  });

  it("reads Source from the sheet into lead.source", async () => {
    const csv = [
      "name,email,phone,country,Source",
      "Ada Lovelace,ada@example.com,+15551234567,United States,Facebook Ads",
    ].join("\n");

    const leads = await processTextData(csv);
    expect(leads).toHaveLength(1);
    expect(leads[0].source).toBe("Facebook Ads");
  });
});
