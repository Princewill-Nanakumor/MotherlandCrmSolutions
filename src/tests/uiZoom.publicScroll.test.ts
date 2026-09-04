import { describe, expect, it } from "vitest";
import { isPublicNativeScrollPath } from "@/lib/uiZoom";

describe("isPublicNativeScrollPath", () => {
  it("includes homepage and marketing nav routes", () => {
    expect(isPublicNativeScrollPath("/")).toBe(true);
    expect(isPublicNativeScrollPath("/features")).toBe(true);
    expect(isPublicNativeScrollPath("/pricing")).toBe(true);
    expect(isPublicNativeScrollPath("/about")).toBe(true);
    expect(isPublicNativeScrollPath("/security")).toBe(true);
    expect(isPublicNativeScrollPath("/contact")).toBe(true);
  });

  it("excludes dashboard and auth", () => {
    expect(isPublicNativeScrollPath("/dashboard")).toBe(false);
    expect(isPublicNativeScrollPath("/dashboard/leads")).toBe(false);
    expect(isPublicNativeScrollPath("/login")).toBe(false);
  });
});
