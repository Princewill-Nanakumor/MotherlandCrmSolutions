// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  async function middleware(request) {
    const token = request.nextauth.token;
    const isAuth = !!token;
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

    // Allow all API routes to pass through (they handle auth internally)
    if (isApiRoute) {
      return NextResponse.next();
    }

    const publicPages = [
      "/",
      "/about",
      "/test-performance",
      "/contact",
      "/login",
      // "/signup", // Hidden - will be enabled later
      // "/forgot-password", // Hidden - will be enabled later
      "/verify-email",
    ];

    const isPublicPage = publicPages.includes(path) || isVerifyEmailPage;
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
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // ✅ Protect admin routes by role
    if (isAdminPage && token?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // ✅ Protect admin management routes by specific emails
    if (isAdminManagementPage && token?.role === "ADMIN" && token?.email) {
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
      return NextResponse.redirect(new URL("/login", request.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ req, token }) => {
        const path = req.nextUrl.pathname;

        const publicPages = [
          "/",
          "/about",
          "/test-performance",
          "/contact",
          "/signup",
          "/forgot-password",
          "/signin",
          "/verify-email",
        ];

        // Allow reset password pages without authentication
        if (path.startsWith("/reset-password")) {
          return true;
        }

        // Allow email verification pages without authentication
        if (path.startsWith("/verify-email")) {
          return true;
        }

        if (publicPages.includes(path)) {
          return true;
        }

        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/api/protected/:path*",
    "/login",
    "/signin",
    "/signup",
    "/forgot-password",
    "/reset-password/:path*",
    "/verify-email/:path*",
    "/dashboard/subscription",
    "/billing",
    "/",
    "/about",
    "/contact",
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - *.jpg, *.jpeg, *.png, *.gif, *.svg, *.webp, *.ico (image files)
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:jpg|jpeg|png|gif|svg|webp|ico)$).*)",
  ],
};
