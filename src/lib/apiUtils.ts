// src/lib/apiUtils.ts

import { hasRecentIntentionalSignOut, isLikelyNetworkError, isPostSignInHandoff } from "@/lib/sessionUtils";

export type ApiCallOptions = RequestInit & {
  /** Request timeout in ms (default 60000). Retry after 401 uses the same value. */
  timeoutMs?: number;
};

/** Avoid a full navigation when already on /login (breaks Playwright + login UX). */
function redirectToLoginPage(options: {
  expired?: boolean;
  callbackPath: string;
}): void {
  const { expired = false, callbackPath } = options;
  const params = new URLSearchParams();
  if (expired) params.set("expired", "true");
  params.set("callbackUrl", callbackPath);
  const target = `/login?${params.toString()}`;

  if (window.location.pathname === "/login") {
    const merged = new URLSearchParams(window.location.search);
    if (!merged.get("callbackUrl")) {
      merged.set("callbackUrl", callbackPath);
    }
    if (expired && merged.get("expired") !== "true") {
      merged.set("expired", "true");
    }
    const qs = merged.toString();
    window.history.replaceState(
      {},
      "",
      `/login${qs ? `?${qs}` : ""}${window.location.hash ?? ""}`,
    );
    return;
  }

  window.location.href = target;
}

/**
 * Helper function to handle API calls with session refresh and better timeout handling
 */
export const apiCallWithSessionRefresh = async (
  url: string,
  options: ApiCallOptions = {},
) => {
  const { timeoutMs = 60000, ...fetchOptions } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Get cached ETag if available
  const cachedETag = typeof window !== 'undefined' ? localStorage.getItem(`etag-${url}`) : null;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...fetchOptions.headers,
        ...(cachedETag && { "If-None-Match": cachedETag }),
      },
    });

    clearTimeout(timeoutId);

    // Handle 304 Not Modified
    if (response.status === 304) {
      return response;
    }

    // Store new ETag if provided
    const newETag = response.headers.get("ETag");
    if (newETag && typeof window !== 'undefined') {
      localStorage.setItem(`etag-${url}`, newETag);
    }

    // If unauthorized, try to refresh session unless API explicitly requests forced logout.
    if (response.status === 401) {
      // User intentionally logged out (manual sign-out). Avoid converting that
      // race into an "expired session" redirect while in-flight requests fail.
      if (typeof window !== "undefined") {
        if (hasRecentIntentionalSignOut()) {
          return response;
        }
      }

      let forceLogout = false;
      try {
        const cloned = response.clone();
        const body = await cloned.json();
        forceLogout = body?.forceLogout === true;
      } catch {
        // Ignore JSON parse failures; keep default refresh flow.
      }

      if (forceLogout) {
        if (typeof window !== "undefined") {
          const { pathname, search } = window.location;
          const callbackPath =
            pathname === "/login" ? "/dashboard" : `${pathname}${search}`;
          redirectToLoginPage({ expired: true, callbackPath });
        }
        throw new Error("Session expired. Please log in again.");
      }

      const refreshController = new AbortController();
      const refreshTimeoutId = setTimeout(
        () => refreshController.abort(),
        15000
      );

      try {
        const refreshResponse = await fetch("/api/auth/session", {
          credentials: "include",
          signal: refreshController.signal,
        });

        clearTimeout(refreshTimeoutId);

        if (refreshResponse.ok) {
          let sessionBody: { user?: { id?: string } } | null = null;
          try {
            sessionBody = (await refreshResponse.json()) as {
              user?: { id?: string };
            };
          } catch {
            sessionBody = null;
          }

          if (sessionBody?.user?.id) {
            // Retry the original request
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(
              () => retryController.abort(),
              timeoutMs,
            );

            try {
              const retryResponse = await fetch(url, {
                ...fetchOptions,
                credentials: "include",
                signal: retryController.signal,
              });
              clearTimeout(retryTimeoutId);
              return retryResponse;
            } catch (retryError) {
              clearTimeout(retryTimeoutId);
              throw retryError;
            }
          }
        }
      } catch (refreshError) {
        clearTimeout(refreshTimeoutId);
        if (isLikelyNetworkError(refreshError)) {
          throw new Error(
            "Could not reach the server. Check your connection and try again.",
          );
        }
      }

      // Session refresh failed with a live server — return to login without
      // implying the JWT expired (e.g. dev server was stopped briefly).
      // During post-login handoff the dashboard layout owns navigation; do
      // not hard-redirect here or we destroy a valid cookie mid-handshake.
      if (typeof window !== "undefined") {
        if (isPostSignInHandoff()) {
          throw new Error("Please sign in again.");
        }
        const { pathname, search } = window.location;
        const callbackPath =
          pathname === "/login" ? "/dashboard" : `${pathname}${search}`;
        redirectToLoginPage({ callbackPath });
      }
      throw new Error("Please sign in again.");
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Please try again.");
    }
    throw error;
  }
};
