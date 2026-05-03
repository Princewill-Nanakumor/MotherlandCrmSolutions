// src/lib/rateLimit.ts
const rateLimitMap = new Map();

export function rateLimit(
  req: Request,
  limit: number = 10,
  windowMs: number = 60000
) {
  // Get IP from headers or use a fallback
  const forwarded = req.headers.get("x-forwarded-for");
  const realIp = req.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap
    .get(ip)
    .filter((timestamp: number) => timestamp > windowStart);
  rateLimitMap.set(ip, requests);

  if (requests.length >= limit) {
    return false;
  }

  requests.push(now);
  return true;
}

// Alternative: More robust IP detection
export function getClientIP(req: Request): string {
  // Try multiple headers for IP detection
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "x-client-ip",
    "cf-connecting-ip", // Cloudflare
    "x-forwarded",
    "forwarded-for",
    "forwarded",
  ];

  for (const header of headers) {
    const value = req.headers.get(header);
    if (value) {
      // Handle comma-separated IPs (take the first one)
      const ip = value.split(",")[0].trim();
      if (ip && ip !== "unknown") {
        return ip;
      }
    }
  }

  return "unknown";
}

// Updated rate limit function with better IP detection
export function rateLimitEnhanced(
  req: Request,
  limit: number = 10,
  windowMs: number = 60000
) {
  const ip = getClientIP(req);
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }

  const requests = rateLimitMap
    .get(ip)
    .filter((timestamp: number) => timestamp > windowStart);
  rateLimitMap.set(ip, requests);

  if (requests.length >= limit) {
    return false;
  }

  requests.push(now);
  return true;
}

// Memory cleanup function to prevent memory leaks
export function cleanupRateLimitMap() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours

  for (const [ip, requests] of rateLimitMap.entries()) {
    const validRequests = requests.filter(
      (timestamp: number) => now - timestamp < maxAge
    );

    if (validRequests.length === 0) {
      rateLimitMap.delete(ip);
    } else {
      rateLimitMap.set(ip, validRequests);
    }
  }
}

// Auto-cleanup every hour
if (typeof window === "undefined") {
  setInterval(cleanupRateLimitMap, 60 * 60 * 1000);
}
