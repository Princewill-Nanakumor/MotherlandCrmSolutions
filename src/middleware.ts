// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/sessionMaxAge";
import {
  isSessionTokenExpired,
  isAuthenticatedSessionToken,
} from "@/lib/sessionToken";
import {
  canAccessAdminManagement,
} from "@/lib/dashboardAccess";
import {
  isOwnerOnlyDashboardPath,
  isUsersDashboardPath,
} from "@/lib/dashboardAdminOnlyPaths";
import { canAccessAllLeads, isAdmin } from "@/lib/roles";

// NOTE: Middleware only runs for paths in `config.matcher` below
// (`/dashboard/*`, `/admin/*`, `/api/protected/*`). Most entries here are not
// matched at all and are kept only so the auth-redirect helpers below stay
// consistent with the route map. Update both when adding a public page.
const PUBLIC_PAGES = [
  "/",
  "/about",
  "/features",
  "/pricing",
  "/security",
  "/contact",
  "/test-performance",
  "/login",
  "/signup",
  "/forgot-password",
  "/verify-email",
] as const;

export default withAuth(
  async function middleware(request) {
    // If token is missing or invalid (e.g. expired), nextauth.token can be undefined; treat as unauthenticated instead of throwing
    const token = request.nextauth?.token;

    const currentTime = Math.floor(Date.now() / 1000);
    const maxAge = SESSION_MAX_AGE_SECONDS;
    const isAuth = isAuthenticatedSessionToken(token, currentTime, maxAge);
    const path = request.nextUrl.pathname;

    const isHomePage = path === "/";
    const isLoginPage = path === "/login";
    const isSignupPage = path === "/signup";
    const isAdminPage = path.startsWith("/admin");
    const isDashboardPage = path.startsWith("/dashboard");
    const isResetPasswordPage = path.startsWith("/reset-password");
    const isVerifyEmailPage = path.startsWith("/verify-email");
    const isAdminManagementPage = path.startsWith(
      "/dashboard/admin-management",
    );
    const isApiRoute = path.startsWith("/api");
    const buildLoginUrl = (callbackUrl: string) => {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", callbackUrl);
      // Only tag `expired=true` when we KNOW the previous token expired.
      // A missing/never-issued token (fresh visitor, post-signin race) must
      // not surface as "Session Expired" — it's a different user story.
      const tokenIsPresentButExpired =
        !!token && isSessionTokenExpired(token, currentTime, maxAge);
      if (tokenIsPresentButExpired) {
        loginUrl.searchParams.set("expired", "true");
      }
      return loginUrl;
    };

    // Allow all API routes to pass through (they handle auth internally)
    if (isApiRoute) {
      return NextResponse.next();
    }

    // Authenticated users should never paint login/signup (avoids CTA flash).
    if (isAuth && (isLoginPage || isSignupPage)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Public pages (incl. /verify-email/*) and reset-password pages are
    // open; everything else falls through to the auth checks below.
    const isPublicPage =
      (PUBLIC_PAGES as readonly string[]).includes(path) || isVerifyEmailPage;
    if (isPublicPage || isResetPasswordPage) {
      return NextResponse.next();
    }

    // ✅ Protect dashboard routes
    if (isDashboardPage && !isAuth) {
      // Preserve where the user was trying to go, so after login
      // they can be returned there (Namecheap-style behavior).
      const url = request.nextUrl;
      const callbackUrl = url.pathname + (url.search || "");
      return NextResponse.redirect(buildLoginUrl(callbackUrl));
    }

    // Owner-only / Users page: role checks only.
    // All Leads ↔ Leads is primarily enforced client-side after JWT RBAC refresh;
    // middleware still sends staff without ASSIGN_LEADS away from owner pages
    // to the correct home (All Leads vs My Leads when the token already has perms).
    if (isDashboardPage && isAuth) {
      const role = token?.role as string | undefined;
      const permissions = Array.isArray(token?.permissions)
        ? (token.permissions as string[])
        : [];
      const staffHome = canAccessAllLeads({ role, permissions })
        ? "/dashboard/all-leads"
        : "/dashboard/leads";
      if (isOwnerOnlyDashboardPath(path) && !isAdmin(role)) {
        return NextResponse.redirect(new URL(staffHome, request.url));
      }
      if (isUsersDashboardPath(path) && !isAdmin(role)) {
        return NextResponse.redirect(new URL(staffHome, request.url));
      }
    }

    // ✅ Protect admin routes by role
    if (isAdminPage && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ✅ Protect admin management routes by specific emails (token.id ensures valid session)
    if (
      isAdminManagementPage &&
      token?.id &&
      token?.role === "ADMIN" &&
      token?.email
    ) {
      const allowedEmails =
        process.env.SUPER_ADMIN_EMAILS?.split(",").map((email) =>
          email.trim(),
        ) || [];
      if (!canAccessAdminManagement(token.email, allowedEmails)) {
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
        return isAuthenticatedSessionToken(
          token,
          currentTime,
          SESSION_MAX_AGE_SECONDS,
        );
      },
    },
    pages: {
      signIn: "/login",
    },
  },
);

export const config = {
  matcher: [
    // Private app routes + auth entry pages (so logged-in users never paint
    // /login or /signup before a client redirect).
    "/login",
    "/signup",
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/protected/:path*",
  ],
};
