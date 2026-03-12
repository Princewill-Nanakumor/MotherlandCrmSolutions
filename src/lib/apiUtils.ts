// src/lib/apiUtils.ts

/**
 * Helper function to handle API calls with session refresh and better timeout handling
 */
export const apiCallWithSessionRefresh = async (
  url: string,
  options: RequestInit = {}
) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  // Get cached ETag if available
  const cachedETag = typeof window !== 'undefined' ? localStorage.getItem(`etag-${url}`) : null;

  try {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
      signal: controller.signal,
      headers: {
        ...options.headers,
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

    // If unauthorized, try to refresh session
    if (response.status === 401) {
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
          // Retry the original request
          const retryController = new AbortController();
          const retryTimeoutId = setTimeout(
            () => retryController.abort(),
            60000
          );

          try {
            const retryResponse = await fetch(url, {
              ...options,
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
      } catch {
        clearTimeout(refreshTimeoutId);
      }

      // Session refresh failed - redirect to login
      if (typeof window !== "undefined") {
        window.location.href = "/login?expired=true";
      }
      throw new Error("Session expired. Please log in again.");
    }

    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};
