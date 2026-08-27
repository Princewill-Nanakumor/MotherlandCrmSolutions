import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone } from "@/lib/contactMasking";

describe("maskEmail", () => {
  it("returns email unchanged when visible", () => {
    expect(maskEmail("jane@example.com", true)).toBe("jane@example.com");
  });

  it("masks local part when hidden", () => {
    expect(maskEmail("jane@example.com", false)).toBe("ja•••@example.com");
  });

  it("returns empty string unchanged", () => {
    expect(maskEmail("", false)).toBe("");
  });

  it("masks invalid emails without @", () => {
    expect(maskEmail("not-an-email", false)).toBe("••••••••");
  });
});

describe("maskPhone", () => {
  it("returns phone unchanged when visible", () => {
    expect(maskPhone("+15551234567", true)).toBe("+15551234567");
  });

  it("shows last 4 digits when hidden", () => {
    expect(maskPhone("+15551234567", false)).toBe("••••••4567");
  });

  it("fully masks short numbers", () => {
    expect(maskPhone("1234", false)).toBe("••••");
  });
});
