// src/lib/rateLimit.ts
const rateLimitMap = new Map<string, number[]>();

export function getClientIP(req: Request): string {
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip",
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      const ip = value.split(",")[0].trim();
      if (ip && ip !== "unknown") {
        return ip;
      }
    }
  }

  return "unknown";
}

function shouldBypassRateLimits(): boolean {
  return process.env.E2E_RELAX_RATE_LIMITS === "1";
}

function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitMap.has(key)) {
    rateLimitMap.set(key, []);
  }

  const requests = rateLimitMap
    .get(key)!
    .filter((timestamp) => timestamp > windowStart);
  rateLimitMap.set(key, requests);

  if (requests.length >= limit) {
    return false;
  }

  requests.push(now);
  return true;
}

/** @deprecated Prefer rateLimitEnhanced with an explicit scope. */
export function rateLimit(
  req: Request,
  limit: number = 10,
  windowMs: number = 60000,
  scope = "legacy",
) {
  if (shouldBypassRateLimits()) {
    return true;
  }
  const ip = getClientIP(req);
  return checkRateLimit(`${scope}:${ip}`, limit, windowMs);
}

/**
 * Per-route rate limiting. Each scope has its own counter per client IP so
 * unrelated endpoints (login, import, bulk status) do not share one bucket.
 */
export function rateLimitEnhanced(
  req: Request,
  limit: number = 10,
  windowMs: number = 60000,
  scope = "default",
): boolean {
  if (shouldBypassRateLimits()) {
    return true;
  }
  const ip = getClientIP(req);
  return checkRateLimit(`${scope}:${ip}`, limit, windowMs);
}

export function cleanupRateLimitMap() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000;

  for (const [key, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(
      (timestamp) => now - timestamp < maxAge,
    );

    if (validRequests.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, validRequests);
    }
  }
}

if (typeof window === "undefined") {
  setInterval(cleanupRateLimitMap, 60 * 60 * 1000);
}
