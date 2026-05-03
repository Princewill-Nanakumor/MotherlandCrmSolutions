/**
 * NextAuth `authorize(credentials, req)` receives `req` built in the App Router
 * as `{ headers: Object.fromEntries(await headers()), cookies: {...}, ... }`
 * (see `node_modules/next-auth/next/index.js` → `NextAuthRouteHandler`).
 *
 * `req.headers` is therefore a **plain object**, not a Web `Headers` instance, so
 * `typeof req.headers.get === "function"` is false and `get("cookie")` is never
 * used — the captcha cookie was effectively invisible and every sign-in failed
 * at captcha validation with a generic security error **before**
 * the password check (wrong password looked like a captcha failure).
 */
export function getCookieHeaderFromNextAuthReq(
  req: { headers?: unknown; cookies?: unknown } | null | undefined,
): string | null {
  if (!req) return null;

  const h = req.headers;
  if (h && typeof h === "object") {
    if (typeof (h as Headers).get === "function") {
      const v = (h as Headers).get("cookie");
      if (v && v.length > 0) return v;
    }
    const o = h as Record<string, string | string[] | undefined>;
    const direct = o.cookie ?? o.Cookie;
    if (typeof direct === "string" && direct.length > 0) return direct;
    if (Array.isArray(direct)) {
      const joined = direct.join("; ");
      if (joined.length > 0) return joined;
    }
  }

  const c = req.cookies;
  if (c && typeof c === "object" && !Array.isArray(c)) {
    const entries = Object.entries(c as Record<string, string>).filter(
      ([, v]) => typeof v === "string" && v.length > 0,
    );
    if (entries.length === 0) return null;
    return entries
      .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
      .join("; ");
  }

  return null;
}
