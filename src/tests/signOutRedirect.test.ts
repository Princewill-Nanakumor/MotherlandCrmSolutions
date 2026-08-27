import { describe, expect, it } from "vitest";

/**
 * Mirror of sanitizeSignOutRedirectUrl in signOutClient.ts (kept local so we
 * can unit-test without jsdom/window mocks for the whole module).
 */
function sanitizeSignOutRedirectUrl(
  candidate: string | undefined,
  fallback: string,
  currentOrigin: string,
): string {
  if (!candidate) return fallback;
  if (candidate.includes("/api/auth/signout")) return fallback;
  try {
    const parsed = new URL(candidate, currentOrigin);
    if (parsed.pathname.endsWith("/api/auth/signout")) return fallback;
    if (parsed.origin === currentOrigin) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

describe("signOut redirect sanitization", () => {
  const vertex = "https://vertexcrmsolution.com";
  const motherland = "https://motherlandcrmsolutions.com";

  it("keeps same-origin relative paths", () => {
    expect(sanitizeSignOutRedirectUrl("/", "/", vertex)).toBe("/");
    expect(
      sanitizeSignOutRedirectUrl(`${vertex}/login`, "/", vertex),
    ).toBe("/login");
  });

  it("rejects Motherland absolute URLs when on Vertex", () => {
    expect(
      sanitizeSignOutRedirectUrl(`${motherland}/`, "/", vertex),
    ).toBe("/");
  });

  it("rejects NextAuth signout interstitial", () => {
    expect(
      sanitizeSignOutRedirectUrl(`${vertex}/api/auth/signout`, "/", vertex),
    ).toBe("/");
  });
});
