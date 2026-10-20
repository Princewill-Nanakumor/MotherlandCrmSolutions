"use client";

import dynamic from "next/dynamic";
import HeroSection from "@/components/homepageComponents/HeroSection";
import StatsSection from "@/components/homepageComponents/StatsSection";
import { HomepageHashScroll } from "@/components/homepageComponents/HomepageHashScroll";
import { InViewSwap } from "@/components/homepageComponents/InViewSwap";
import {
  FeaturesSectionSeo,
  FaqSectionSeo,
  PricingSectionSeo,
  TimelineSectionSeo,
} from "@/components/homepageComponents/HomepageSeoSections";
import { TermsConsentBanner } from "@/components/homepageComponents/TermsConsentBanner";
import { HOME_VOXEL_SPLITS } from "@/components/homepageComponents/homepageContent";
import {
  VoxelSplitBand,
  VoxelSplitStack,
} from "@/components/homepageComponents/VoxelSplitBand";

const voxelById = (id: string) => HOME_VOXEL_SPLITS.find((s) => s.id === id);
const HOME_VOXEL_TEAM = voxelById("home-team");
const HOME_VOXEL_DESK = voxelById("home-desk");
const HOME_VOXEL_TAIL = HOME_VOXEL_SPLITS.filter(
  (s) => s.id !== "home-team" && s.id !== "home-desk",
);

/**
 * Code-split below-fold sections into separate chunks.
 * Default `ssr: true` keeps marketing HTML (FAQ, features, pricing, etc.)
 * in the initial document for SEO / no-JS crawlers. Map animations pause
 * themselves when off-screen via createMapAnimationGate.
 *
 * Shell chrome (nav/footer/providers/route progress) lives in MarketingPageShell
 * so navigating between `/` and other marketing routes does not remount it.
 */
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

export default function HomePageClient() {
  return (
    <>
      <HomepageHashScroll />
      <TermsConsentBanner />
      <HeroSection />
      <StatsSection />
      {HOME_VOXEL_TEAM ? <VoxelSplitBand split={HOME_VOXEL_TEAM} /> : null}
      <ArchitectureSection />
      <InViewSwap fallback={<FeaturesSectionSeo />}>
        <FeaturesSection />
      </InViewSwap>
      {HOME_VOXEL_DESK ? <VoxelSplitBand split={HOME_VOXEL_DESK} /> : null}
      <InViewSwap fallback={<TimelineSectionSeo />}>
        <TimelineSection />
      </InViewSwap>
      {HOME_VOXEL_TAIL.length > 0 ? (
        <InViewSwap
          fallback={<div className="min-h-144 bg-white" aria-hidden />}
          rootMargin="400px 0px"
        >
          <VoxelSplitStack splits={HOME_VOXEL_TAIL} />
        </InViewSwap>
      ) : null}
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
    </>
  );
}
