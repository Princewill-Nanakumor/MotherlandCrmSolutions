"use client";

import type { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import HomeFooter from "@/components/homepageComponents/HomeFooter";
import { ScrollProgress } from "@/components/homepageComponents/ScrollProgress";
import { ScrollToTopButton } from "@/components/homepageComponents/ScrollToTopButton";
import { BrandThemeApplier } from "@/components/BrandThemeApplier";
import { PublicLightTheme } from "@/components/PublicLightTheme";
import { PublicNativeScroll } from "@/components/homepageComponents/PublicNativeScroll";
import CtaBandSection from "@/components/homepageComponents/CtaBandSection";
import { MarketingRouteProgress } from "@/components/homepageComponents/MarketingRouteProgress";
import { MarketingPageTransition } from "@/components/homepageComponents/MarketingPageTransition";

export function MarketingPageShell({
  children,
  showCta = true,
}: {
  children: ReactNode;
  showCta?: boolean;
}) {
  return (
    <SessionProvider refetchInterval={0} refetchOnWindowFocus={false}>
      <PublicNativeScroll />
      <PublicLightTheme />
      <BrandThemeApplier />
      <div className="homepage bg-white text-gray-900 [font-family:var(--brand-font-body)]">
        <MarketingRouteProgress />
        <ScrollProgress />
        <ScrollToTopButton />
        <Navbar />
        <MarketingPageTransition>
          <main>{children}</main>
          {showCta ? <CtaBandSection /> : null}
        </MarketingPageTransition>
        <HomeFooter />
      </div>
    </SessionProvider>
  );
}
