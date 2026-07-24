// src/app/(auth)/layout.tsx — shared shell for /login, /signup, password reset, verify-email

"use client";

import Link from "next/link";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { usePathname } from "next/navigation";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { BrandThemeApplier } from "@/components/BrandThemeApplier";
import { PublicLightTheme } from "@/components/PublicLightTheme";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { displayName } = useAppBranding();
  const isHeroAuthPage =
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname === "/forgot-password" ||
    (pathname?.startsWith("/reset-password/") ?? false) ||
    (pathname?.startsWith("/verify-email/") ?? false);

  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when user returns to window (important for offline → online)
    >
      <ThemeProvider forcedTheme="light" enableSystem={false}>
        <PublicLightTheme />
        <BrandThemeApplier />
        {isHeroAuthPage ? (
          // Full-bleed hero + navbar (same shell as login); pages inject their own <style>
          <div className="min-h-screen [font-family:var(--brand-font-body)]">
            {children}
          </div>
        ) : (
          <div className="auth-routes-shell brand-page-wash min-h-screen flex items-center justify-center [font-family:var(--brand-font-body)]">
            <div className="px-3 py-4 w-full max-w-sm sm:max-w-md md:max-w-lg sm:px-4 sm:py-6">
              <div className="mb-6 text-center sm:mb-8">
                <Link
                  href="/"
                  className="inline-flex items-center mb-3 space-x-2 sm:space-x-3 sm:mb-4"
                >
                  <MotherlandLogo className="h-9 w-9 rounded-lg shadow-md sm:h-11 sm:w-11" />
                  <div className="text-xl font-bold sm:text-2xl brand-text-gradient">
                    {displayName}
                  </div>
                </Link>
              </div>
              {children}
            </div>
          </div>
        )}
      </ThemeProvider>
    </SessionProvider>
  );
}
