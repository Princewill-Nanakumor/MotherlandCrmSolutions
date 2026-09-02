// src/components/homepageComponents/HomePageClient.tsx
"use client";

import dynamic from "next/dynamic";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import { ScrollProgress } from "@/components/homepageComponents/ScrollProgress";
import { ScrollToTopButton } from "@/components/homepageComponents/ScrollToTopButton";
import HeroSection from "@/components/homepageComponents/HeroSection";
import StatsSection from "@/components/homepageComponents/StatsSection";
import { BrandThemeApplier } from "@/components/BrandThemeApplier";
import { PublicLightTheme } from "@/components/PublicLightTheme";
import { PublicNativeScroll } from "@/components/homepageComponents/PublicNativeScroll";
import HomeFooter from "@/components/homepageComponents/HomeFooter";
import { HomepageHashScroll } from "@/components/homepageComponents/HomepageHashScroll";
import { InViewSwap } from "@/components/homepageComponents/InViewSwap";
import {
  FeaturesSectionSeo,
  FaqSectionSeo,
  PricingSectionSeo,
  TimelineSectionSeo,
} from "@/components/homepageComponents/HomepageSeoSections";

/**
 * Code-split below-fold sections into separate chunks.
 * Default `ssr: true` keeps marketing HTML (FAQ, features, pricing, etc.)
 * in the initial document for SEO / no-JS crawlers. Map animations pause
 * themselves when off-screen via createMapAnimationGate.
 */
const FeaturedCrmSection = dynamic(
  () => import("@/components/homepageComponents/FeaturedCrmSection"),
  // Sticky story is tall; reserve a viewport so late chunk mount doesn't shove CLS.
  { loading: () => <div className="min-h-screen" aria-hidden /> },
);
const ArchitectureSection = dynamic(
  () => import("@/components/homepageComponents/ArchitectureSection"),
  { loading: () => <div className="min-h-112" aria-hidden /> },
);
const FeaturesSection = dynamic(
  () => import("@/components/homepageComponents/FeaturesSection"),
  { ssr: false, loading: () => <FeaturesSectionSeo /> },
);
const TimelineSection = dynamic(
  () => import("@/components/homepageComponents/TimelineSection"),
  { ssr: false, loading: () => <TimelineSectionSeo /> },
);
const AudiencesSection = dynamic(
  () => import("@/components/homepageComponents/AudiencesSection"),
  { ssr: false },
);
const SubscriptionPlansSection = dynamic(
  () => import("@/components/homepageComponents/SubscriptionPlansSection"),
  { ssr: false, loading: () => <PricingSectionSeo /> },
);
const FaqSection = dynamic(
  () => import("@/components/homepageComponents/FaqSection"),
  { ssr: false, loading: () => <FaqSectionSeo /> },
);
const CtaBandSection = dynamic(
  () => import("@/components/homepageComponents/CtaBandSection"),
  { ssr: false },
);

function HomePageContent() {
  return (
    <div
      className="homepage bg-white text-gray-900 [font-family:var(--brand-font-body)]"
      style={{ backgroundColor: "#ffffff" }}
    >
      <ScrollProgress />
      <HomepageHashScroll />
      <ScrollToTopButton />
      <Navbar />
      <main>
        <HeroSection />
        <StatsSection />
        <FeaturedCrmSection />
        <ArchitectureSection />
        <InViewSwap fallback={<FeaturesSectionSeo />}>
          <FeaturesSection />
        </InViewSwap>
        <InViewSwap fallback={<TimelineSectionSeo />}>
          <TimelineSection />
        </InViewSwap>
        <InViewSwap
          // Reserve roughly the live section height so swap doesn't spike CLS.
          fallback={
            <div
              className="px-6 py-20 sm:py-28"
              style={{ minHeight: "42rem" }}
              aria-hidden
            />
          }
          rootMargin="400px 0px"
        >
          <AudiencesSection />
        </InViewSwap>
        <InViewSwap fallback={<PricingSectionSeo />}>
          <SubscriptionPlansSection />
        </InViewSwap>
        <InViewSwap fallback={<FaqSectionSeo />}>
          <FaqSection />
        </InViewSwap>
        <InViewSwap
          fallback={
            <div
              className="px-6 py-10 sm:py-12"
              style={{ minHeight: "28rem" }}
              aria-hidden
            />
          }
          rootMargin="400px 0px"
        >
          <CtaBandSection />
        </InViewSwap>
      </main>
      <HomeFooter />
    </div>
  );
}

export default function HomePageClient() {
  return (
    <SessionProvider
      // Homepage only needs session for nav CTAs — avoid aggressive polling.
      refetchInterval={0}
      refetchOnWindowFocus={false}
    >
      <PublicNativeScroll />
      <PublicLightTheme />
      <BrandThemeApplier />
      <HomePageContent />
    </SessionProvider>
  );
}
