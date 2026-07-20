// src/app/(auth)/layout.tsx — shared shell for /login, /signup, password reset, verify-email

"use client";

import { Shield } from "lucide-react";
import Link from "next/link";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import { usePathname } from "next/navigation";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { BrandThemeApplier } from "@/components/BrandThemeApplier";

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
      <ThemeProvider>
        <BrandThemeApplier />
        {isHeroAuthPage ? (
          // Full-bleed hero + navbar (same shell as login); pages inject their own <style>
          <div className="min-h-screen [font-family:var(--brand-font-body)]">
            {children}
          </div>
        ) : (
          <div className="auth-routes-shell brand-page-wash min-h-screen flex items-center justify-center dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 [font-family:var(--brand-font-body)]">
            <div className="w-full max-w-sm sm:max-w-md md:max-w-lg px-3 sm:px-4 py-4 sm:py-6">
              <div className="text-center mb-6 sm:mb-8">
                <Link
                  href="/"
                  className="inline-flex items-center space-x-2 sm:space-x-3 mb-3 sm:mb-4"
                >
                  <div className="p-1.5 sm:p-2 brand-gradient rounded-lg shadow-md">
                    <Shield
                      size={28}
                      className="sm:w-[35px] sm:h-[35px] text-white"
                    />
                  </div>
                  <div className="text-xl sm:text-2xl font-bold brand-text-gradient">
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
