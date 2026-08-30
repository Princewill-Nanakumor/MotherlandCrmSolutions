import { describe, expect, it, beforeEach } from "vitest";
import { rateLimitEnhanced } from "@/lib/rateLimit";

function req(): Request {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": "203.0.113.1" },
  });
}

describe("rateLimitEnhanced", () => {
  beforeEach(() => {
    delete process.env.E2E_RELAX_RATE_LIMITS;
  });

  it("scopes counters per route so import is not blocked by auth traffic", () => {
    const request = req();

    for (let i = 0; i < 5; i++) {
      expect(rateLimitEnhanced(request, 5, 60_000, "auth-nextauth")).toBe(true);
    }
    expect(rateLimitEnhanced(request, 5, 60_000, "auth-nextauth")).toBe(false);

    expect(rateLimitEnhanced(request, 5, 60_000, "leads-import")).toBe(true);
  });

  it("bypasses limits when E2E_RELAX_RATE_LIMITS=1", () => {
    process.env.E2E_RELAX_RATE_LIMITS = "1";
    const request = req();

    for (let i = 0; i < 20; i++) {
      expect(rateLimitEnhanced(request, 1, 60_000, "leads-import")).toBe(true);
    }
  });
});
