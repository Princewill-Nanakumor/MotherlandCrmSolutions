// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/sessionMaxAge";

const PUBLIC_PAGES = [
  "/",
  "/about",
  "/test-performance",
  "/contact",
  "/login",
  "/signup",
  // "/forgot-password", // Hidden - will be enabled later
  "/verify-email",
] as const;

/** Match libs/auth.ts jwt/session callbacks: exp, iat, and loginTimestamp vs SESSION_MAX_AGE_SECONDS. */
function isSessionTokenExpired(
  token:
    | { loginTimestamp?: number; exp?: number; iat?: number }
    | undefined
    | null,
  nowSec: number,
  maxAgeSeconds: number,
): boolean {
  const exp = token?.exp;
  if (typeof exp === "number" && exp > 0 && exp < nowSec) return true;
  const iat = token?.iat;
  if (typeof iat === "number" && nowSec - iat > maxAgeSeconds) return true;
  if (
    typeof token?.loginTimestamp === "number" &&
    nowSec - token.loginTimestamp > maxAgeSeconds
  ) {
    return true;
  }
  return false;
}

export default withAuth(
  async function middleware(request) {
    // If token is missing or invalid (e.g. expired), nextauth.token can be undefined; treat as unauthenticated instead of throwing
    const token = request.nextauth?.token;
    
    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = SESSION_MAX_AGE_SECONDS;
    const isExpired = isSessionTokenExpired(token, currentTime, maxAge);
      
    // A token is only valid if it has an id and it's not expired
    const isAuth = !!token?.id && !isExpired;
    const path = request.nextUrl.pathname;

    const isHomePage = path === "/";
    const isLoginPage = path === "/login";
    const isAdminPage = path.startsWith("/admin");
    const isDashboardPage = path.startsWith("/dashboard");
    const isResetPasswordPage = path.startsWith("/reset-password");
    const isVerifyEmailPage = path.startsWith("/verify-email");
    const isAdminManagementPage = path.startsWith(
      "/dashboard/admin-management"
    );
    const isApiRoute = path.startsWith("/api");
    const buildLoginUrl = (callbackUrl: string) => {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      // Protected-route auth redirects should surface the expiry toast.
      // In some edge cases token is already missing by the time middleware runs,
      // so isExpired can be false even though session just expired.
      if (isExpired || isDashboardPage || isAdminPage) {
        loginUrl.searchParams.set("expired", "true");
      }
      return loginUrl;
    };

    // Allow all API routes to pass through (they handle auth internally)
    if (isApiRoute) {
      return NextResponse.next();
    }

    const isPublicPage =
      (PUBLIC_PAGES as readonly string[]).includes(path) || isVerifyEmailPage;
    // ✅ Allow access to public pages
    if (isPublicPage) {
      return NextResponse.next();
    }

    // ✅ Allow access to reset password pages (no auth required)
    if (isResetPasswordPage) {
      return NextResponse.next();
    }

    // ✅ Allow access to email verification pages (no auth required)
    if (isVerifyEmailPage) {
      return NextResponse.next();
    }

    // ✅ Redirect authenticated users away from login page
    if (isLoginPage && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ✅ Protect dashboard routes
    if (isDashboardPage && !isAuth) {
      // Preserve where the user was trying to go, so after login
      // they can be returned there (Namecheap-style behavior).
      const url = request.nextUrl;
      const callbackUrl = url.pathname + (url.search || "");
      return NextResponse.redirect(buildLoginUrl(callbackUrl));
    }

    // ✅ Protect admin routes by role
    if (isAdminPage && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ✅ Protect admin management routes by specific emails (token.id ensures valid session)
    if (isAdminManagementPage && token?.id && token?.role === "ADMIN" && token?.email) {
      const allowedEmails =
        process.env.SUPER_ADMIN_EMAILS?.split(",").map((email) =>
          email.trim()
        ) || [];
      if (allowedEmails.length > 0 && !allowedEmails.includes(token.email)) {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }

    // ✅ Redirect unauthenticated users trying to access other pages
    if (!isAuth && !isPublicPage && !isHomePage && !isLoginPage) {
      const url = request.nextUrl;
      const callbackUrl = url.pathname + (url.search || "");
      return NextResponse.redirect(buildLoginUrl(callbackUrl));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;
        const isDashboardRoute = path.startsWith("/dashboard");
        const isAdminRoute = path.startsWith("/admin");

        // Let middleware() handle dashboard/admin auth redirects so we can
        // include app-specific params like `expired=true` consistently.
        if (isDashboardRoute || isAdminRoute) {
          return true;
        }

        // Allow reset password pages without authentication
        if (path.startsWith("/reset-password")) {
          return true;
        }

        // Allow email verification pages without authentication
        if (path.startsWith("/verify-email")) {
          return true;
        }

        if ((PUBLIC_PAGES as readonly string[]).includes(path)) {
          return true;
        }

        const currentTime = Math.floor(Date.now() / 1000);
        const maxAge = SESSION_MAX_AGE_SECONDS;
        const isExpired = isSessionTokenExpired(token, currentTime, maxAge);

        return !!token?.id && !isExpired;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    // Only protect truly private routes server-side. Let public/static routes
    // and general navigation be handled client-side to avoid redirect flashes.
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/protected/:path*",
  ],
};
