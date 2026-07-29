// src/components/homepageComponents/HomePageClient.tsx
"use client";

import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import { ScrollProgress } from "@/components/homepageComponents/ScrollProgress";
import HeroSection from "@/components/homepageComponents/HeroSection";
import StatsSection from "@/components/homepageComponents/StatsSection";
import FeaturedCrmSection from "@/components/homepageComponents/FeaturedCrmSection";
import ArchitectureSection from "@/components/homepageComponents/ArchitectureSection";
import FeaturesSection from "@/components/homepageComponents/FeaturesSection";
import TimelineSection from "@/components/homepageComponents/TimelineSection";
import AudiencesSection from "@/components/homepageComponents/AudiencesSection";
import SubscriptionPlansSection from "@/components/homepageComponents/SubscriptionPlansSection";
import FaqSection from "@/components/homepageComponents/FaqSection";
import CtaBandSection from "@/components/homepageComponents/CtaBandSection";
import HomeFooter from "@/components/homepageComponents/HomeFooter";
import { BrandThemeApplier } from "@/components/BrandThemeApplier";
import { PublicLightTheme } from "@/components/PublicLightTheme";
import { PublicNativeScroll } from "@/components/homepageComponents/PublicNativeScroll";

function HomePageContent() {
  return (
    <div
      className="homepage bg-white text-gray-900 [font-family:var(--brand-font-body)]"
      style={{ backgroundColor: "#ffffff" }}
    >
      <ScrollProgress />
      <Navbar />
      <main className="overflow-x-clip">
        <HeroSection />
        <StatsSection />
        <FeaturedCrmSection />
        <ArchitectureSection />
        <FeaturesSection />
        <TimelineSection />
        <AudiencesSection />
        <SubscriptionPlansSection />
        <FaqSection />
        <CtaBandSection />
      </main>
      <HomeFooter />
    </div>
  );
}

export default function HomePageClient() {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <PublicNativeScroll />
      <PublicLightTheme />
      <BrandThemeApplier />
      <HomePageContent />
    </SessionProvider>
  );
}
