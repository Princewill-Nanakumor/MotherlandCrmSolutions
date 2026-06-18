"use client";

type AuthDebugPayload = Record<string, unknown>;

/**
 * Enable in production: add `?authDebug=1` to the login URL, or run in the console:
 * `localStorage.setItem('auth:debug', '1'); location.reload()`
 * Disable: `localStorage.removeItem('auth:debug'); location.reload()`
 */
export function isAuthDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("auth:debug") === "1") return true;
  } catch {
    /* ignore */
  }
  try {
    return new URLSearchParams(window.location.search).get("authDebug") === "1";
  } catch {
    return false;
  }
}

export function authDebug(step: string, payload?: AuthDebugPayload): void {
  if (!isAuthDebugEnabled()) return;
  const line = `[auth-debug] ${step}`;
  if (payload && Object.keys(payload).length > 0) {
    console.log(line, payload);
  } else {
    console.log(line);
  }
}
