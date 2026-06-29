// src/lib/loginInfo.ts
// Helpers to derive human-readable login context (device, OS, browser, country,
// IP) from a request's headers. Used at sign-in to record the latest login.

export interface LoginInfo {
  ip?: string;
  country?: string; // Full country name when resolvable, otherwise the raw code
  countryCode?: string;
  device?: string; // "Desktop" | "Mobile" | "Tablet"
  os?: string; // e.g. "Windows", "macOS", "iOS", "Android"
  browser?: string; // e.g. "Chrome", "Safari", "Firefox"
  userAgent?: string;
  at?: Date;
}

/**
 * Reads a header value from either a Web `Headers` instance or the plain object
 * NextAuth passes into `authorize` (App Router builds `req.headers` from
 * `Object.fromEntries(await headers())`).
 */
function readHeader(headers: unknown, name: string): string | undefined {
  if (!headers || typeof headers !== "object") return undefined;

  const asHeaders = headers as Headers;
  if (typeof asHeaders.get === "function") {
    const v = asHeaders.get(name);
    if (v) return v;
  }

  const obj = headers as Record<string, string | string[] | undefined>;
  const lower = name.toLowerCase();
  const raw = obj[lower] ?? obj[name];
  if (Array.isArray(raw)) return raw[0];
  return typeof raw === "string" ? raw : undefined;
}

function parseClientIp(headers: unknown): string | undefined {
  const forwarded = readHeader(headers, "x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    readHeader(headers, "x-real-ip") ||
    readHeader(headers, "cf-connecting-ip") ||
    undefined
  );
}

function regionNameFromCode(code: string): string | undefined {
  const normalized = code.trim().toUpperCase();
  if (normalized.length !== 2) return undefined;
  try {
    const display = new Intl.DisplayNames(["en"], { type: "region" });
    return display.of(normalized) || undefined;
  } catch {
    return undefined;
  }
}

function parseCountry(headers: unknown): {
  country?: string;
  countryCode?: string;
} {
  // Vercel, Cloudflare, common proxies.
  const code =
    readHeader(headers, "x-vercel-ip-country") ||
    readHeader(headers, "cf-ipcountry") ||
    readHeader(headers, "x-country-code") ||
    readHeader(headers, "x-geo-country");

  if (code && code !== "XX") {
    const upper = code.trim().toUpperCase();
    return { countryCode: upper, country: regionNameFromCode(upper) || upper };
  }

  // Netlify ships geo as a base64-encoded JSON blob.
  const nfGeo = readHeader(headers, "x-nf-geo");
  if (nfGeo) {
    try {
      const decoded = JSON.parse(
        Buffer.from(nfGeo, "base64").toString("utf-8"),
      ) as { country?: { code?: string; name?: string } };
      const nfCode = decoded.country?.code;
      const nfName = decoded.country?.name;
      if (nfCode || nfName) {
        return {
          countryCode: nfCode?.toUpperCase(),
          country:
            nfName ||
            (nfCode ? regionNameFromCode(nfCode) || nfCode : undefined),
        };
      }
    } catch {
      // ignore malformed geo header
    }
  }

  return {};
}

/**
 * True only for routable public IPs. Private/loopback/link-local addresses
 * (e.g. localhost or LAN) can't be geolocated, so we skip the lookup for them.
 */
function isPublicIp(ip?: string): ip is string {
  if (!ip) return false;
  const addr = ip.trim().toLowerCase();
  if (!addr || addr === "::1" || addr === "localhost") return false;

  // IPv4 private / loopback / link-local ranges.
  if (/^127\./.test(addr)) return false;
  if (/^10\./.test(addr)) return false;
  if (/^192\.168\./.test(addr)) return false;
  if (/^169\.254\./.test(addr)) return false;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(addr)) return false;

  // IPv6 unique-local / link-local.
  if (addr.startsWith("fc") || addr.startsWith("fd")) return false;
  if (addr.startsWith("fe80")) return false;

  return true;
}

/**
 * Resolves a country from a public IP using a free, key-less geolocation API.
 * Returns undefined on any failure/timeout so login is never blocked.
 */
async function resolveCountryFromIp(
  ip: string,
): Promise<{ country?: string; countryCode?: string } | undefined> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const res = await fetch(
      `https://ipwho.is/${encodeURIComponent(ip)}?fields=success,country,country_code`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as {
      success?: boolean;
      country?: string;
      country_code?: string;
    };
    if (!data?.success) return undefined;
    const code = data.country_code?.toUpperCase();
    const name =
      data.country || (code ? regionNameFromCode(code) || code : undefined);
    if (!name && !code) return undefined;
    return { country: name, countryCode: code };
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

function parseOs(ua: string): string | undefined {
  if (/windows nt/i.test(ua)) return "Windows";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/android/i.test(ua)) return "Android";
  if (/mac os x|macintosh/i.test(ua)) return "macOS";
  if (/cros/i.test(ua)) return "Chrome OS";
  if (/linux/i.test(ua)) return "Linux";
  return undefined;
}

function parseBrowser(ua: string): string | undefined {
  if (/edg\//i.test(ua)) return "Edge";
  if (/opr\/|opera/i.test(ua)) return "Opera";
  if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
  if (/firefox\/|fxios/i.test(ua)) return "Firefox";
  if (/chrome\/|crios/i.test(ua) && !/edg\//i.test(ua)) return "Chrome";
  if (/safari/i.test(ua) && !/chrome\//i.test(ua)) return "Safari";
  return undefined;
}

function parseDevice(ua: string): string {
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "Tablet";
  if (/(android(?!.*mobile))/i.test(ua)) return "Tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(ua))
    return "Mobile";
  return "Desktop";
}

/**
 * Builds a {@link LoginInfo} snapshot from request headers. Safe to call with
 * either a Web `Headers` object or NextAuth's plain header object.
 */
export function extractLoginInfo(headers: unknown): LoginInfo {
  const userAgent = readHeader(headers, "user-agent") || "";
  const { country, countryCode } = parseCountry(headers);

  return {
    ip: parseClientIp(headers),
    country,
    countryCode,
    device: parseDevice(userAgent),
    os: parseOs(userAgent),
    browser: parseBrowser(userAgent),
    userAgent: userAgent || undefined,
    at: new Date(),
  };
}

/**
 * Like {@link extractLoginInfo}, but when the host provides no geo header it
 * falls back to an IP-based geolocation lookup (public IPs only). Use this on
 * the server login path where a brief async lookup is acceptable.
 */
export async function extractLoginInfoWithGeo(
  headers: unknown,
): Promise<LoginInfo> {
  const info = extractLoginInfo(headers);

  if (!info.country && isPublicIp(info.ip)) {
    const resolved = await resolveCountryFromIp(info.ip);
    if (resolved) {
      info.country = resolved.country;
      info.countryCode = resolved.countryCode;
    }
  }

  return info;
}
