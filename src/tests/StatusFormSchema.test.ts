import { describe, expect, it } from "vitest";
import { StatusFormSchema } from "@/schemas/StatusFormSchema";

describe("StatusFormSchema", () => {
  it("accepts a valid name and hex color", () => {
    const result = StatusFormSchema.safeParse({
      name: "Qualified",
      color: "#3B82F6",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "Qualified", color: "#3B82F6" });
    }
  });

  it("trims the name", () => {
    const result = StatusFormSchema.safeParse({
      name: "  Follow Up  ",
      color: "#abcdef",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Follow Up");
      expect(result.data.color).toBe("#abcdef");
    }
  });

  it("rejects empty name", () => {
    const result = StatusFormSchema.safeParse({ name: "   ", color: "#000000" });
    expect(result.success).toBe(false);
  });

  it("rejects reserved NEW name", () => {
    const result = StatusFormSchema.safeParse({ name: "new", color: "#000000" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid color", () => {
    expect(
      StatusFormSchema.safeParse({ name: "Hot", color: "blue" }).success,
    ).toBe(false);
    expect(
      StatusFormSchema.safeParse({ name: "Hot", color: "#fff" }).success,
    ).toBe(false);
  });
});
