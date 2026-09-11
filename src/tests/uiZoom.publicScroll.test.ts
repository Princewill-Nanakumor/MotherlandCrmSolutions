import { describe, expect, it } from "vitest";
import { isAuthHeroPath, isPublicNativeScrollPath } from "@/lib/uiZoom";

describe("isPublicNativeScrollPath", () => {
  it("includes homepage and marketing nav routes", () => {
    expect(isPublicNativeScrollPath("/")).toBe(true);
    expect(isPublicNativeScrollPath("/features")).toBe(true);
    expect(isPublicNativeScrollPath("/pricing")).toBe(true);
    expect(isPublicNativeScrollPath("/about")).toBe(true);
    expect(isPublicNativeScrollPath("/security")).toBe(true);
    expect(isPublicNativeScrollPath("/contact")).toBe(true);
  });

  it("includes auth hero routes so Windows density scale does not offset the form", () => {
    expect(isAuthHeroPath("/login")).toBe(true);
    expect(isPublicNativeScrollPath("/login")).toBe(true);
    expect(isPublicNativeScrollPath("/signup")).toBe(true);
    expect(isPublicNativeScrollPath("/forgot-password")).toBe(true);
    expect(isPublicNativeScrollPath("/reset-password/abc")).toBe(true);
    expect(isPublicNativeScrollPath("/verify-email/abc")).toBe(true);
  });

  it("excludes dashboard", () => {
    expect(isPublicNativeScrollPath("/dashboard")).toBe(false);
    expect(isPublicNativeScrollPath("/dashboard/leads")).toBe(false);
  });
});
