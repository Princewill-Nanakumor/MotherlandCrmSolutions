import { describe, expect, it } from "vitest";
import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_REMEMBER_MAX_AGE_SECONDS,
} from "./sessionMaxAge";
import {
  isAuthenticatedSessionToken,
  isRememberMeToken,
  isSessionTokenExpired,
} from "./sessionToken";

describe("isSessionTokenExpired", () => {
  const now = 1_700_000_000;

  it("treats missing token as not expired (caller checks id)", () => {
    expect(isSessionTokenExpired(null, now)).toBe(false);
  });

  it("expires when exp is in the past", () => {
    expect(isSessionTokenExpired({ id: "u1", exp: now - 1 }, now)).toBe(true);
  });

  it("expires when iat exceeds default max age", () => {
    expect(
      isSessionTokenExpired(
        { id: "u1", iat: now - SESSION_MAX_AGE_SECONDS - 1 },
        now,
      ),
    ).toBe(true);
  });

  it("honors remember-me maxAgeSec on the token", () => {
    expect(
      isSessionTokenExpired(
        {
          id: "u1",
          iat: now - SESSION_MAX_AGE_SECONDS - 1,
          maxAgeSec: SESSION_REMEMBER_MAX_AGE_SECONDS,
        },
        now,
      ),
    ).toBe(false);

    expect(
      isSessionTokenExpired(
        {
          id: "u1",
          iat: now - SESSION_REMEMBER_MAX_AGE_SECONDS - 1,
          maxAgeSec: SESSION_REMEMBER_MAX_AGE_SECONDS,
        },
        now,
      ),
    ).toBe(true);
  });

  it("expires via loginTimestamp absolute window", () => {
    expect(
      isSessionTokenExpired(
        { id: "u1", loginTimestamp: now - SESSION_MAX_AGE_SECONDS - 5 },
        now,
      ),
    ).toBe(true);
  });
});

describe("isAuthenticatedSessionToken", () => {
  const now = 1_700_000_000;

  it("requires id and non-expired token", () => {
    expect(isAuthenticatedSessionToken({ iat: now }, now)).toBe(false);
    expect(
      isAuthenticatedSessionToken({ id: "u1", iat: now }, now),
    ).toBe(true);
  });
});

describe("isRememberMeToken", () => {
  it("detects remember-me maxAgeSec", () => {
    expect(isRememberMeToken({ maxAgeSec: SESSION_REMEMBER_MAX_AGE_SECONDS })).toBe(
      true,
    );
    expect(isRememberMeToken({ maxAgeSec: SESSION_MAX_AGE_SECONDS })).toBe(false);
  });
});
