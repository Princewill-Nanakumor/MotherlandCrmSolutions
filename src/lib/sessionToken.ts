import {
  SESSION_MAX_AGE_SECONDS,
  SESSION_REMEMBER_MAX_AGE_SECONDS,
} from "./sessionMaxAge";

export type SessionTokenLike = {
  id?: string;
  role?: string;
  email?: string;
  loginTimestamp?: number;
  exp?: number;
  iat?: number;
  maxAgeSec?: number;
} | null | undefined;

/**
 * Match libs/auth.ts jwt/session callbacks: exp, iat, and loginTimestamp vs
 * the per-token `maxAgeSec` (chosen at login: default vs "Remember me"),
 * falling back to SESSION_MAX_AGE_SECONDS for legacy tokens.
 */
export function isSessionTokenExpired(
  token: SessionTokenLike,
  nowSec: number,
  defaultMaxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): boolean {
  const effective =
    typeof token?.maxAgeSec === "number" && token.maxAgeSec > 0
      ? token.maxAgeSec
      : defaultMaxAgeSeconds;
  const exp = token?.exp;
  if (typeof exp === "number" && exp > 0 && exp < nowSec) return true;
  const iat = token?.iat;
  if (typeof iat === "number" && nowSec - iat > effective) return true;
  if (
    typeof token?.loginTimestamp === "number" &&
    nowSec - token.loginTimestamp > effective
  ) {
    return true;
  }
  return false;
}

export function isRememberMeToken(token: SessionTokenLike): boolean {
  return token?.maxAgeSec === SESSION_REMEMBER_MAX_AGE_SECONDS;
}

export function isAuthenticatedSessionToken(
  token: SessionTokenLike,
  nowSec: number,
  defaultMaxAgeSeconds: number = SESSION_MAX_AGE_SECONDS,
): boolean {
  return !!token?.id && !isSessionTokenExpired(token, nowSec, defaultMaxAgeSeconds);
}
