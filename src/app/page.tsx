"use client";

import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import HeroSection from "@/components/homepageComponents/HeroSection";
import TrustStatsSection from "@/components/homepageComponents/TrustStatsSection";
import FeaturesSection from "@/components/homepageComponents/FeaturesSection";
import HowItWorksSection from "@/components/homepageComponents/HowItWorksSection";
import AudiencesSection from "@/components/homepageComponents/AudiencesSection";
import SubscriptionPlansSection from "@/components/homepageComponents/SubscriptionPlansSection";
import FaqSection from "@/components/homepageComponents/FaqSection";
import CtaBandSection from "@/components/homepageComponents/CtaBandSection";
import HomeFooter from "@/components/homepageComponents/HomeFooter";
import { BrandThemeApplier } from "@/components/BrandThemeApplier";
import { PublicLightTheme } from "@/components/PublicLightTheme";

// Homepage is available to everyone (logged in or not); Navbar can show different links based on session
function HomePageContent() {
  return (
    <div
      className="homepage bg-white text-gray-900 [font-family:var(--brand-font-body)]"
      style={{ backgroundColor: "#ffffff" }}
    >
      <Navbar />
      <main>
        <HeroSection />
        <TrustStatsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <AudiencesSection />
        <SubscriptionPlansSection />
        <FaqSection />
        <CtaBandSection />
      </main>
      <HomeFooter />
    </div>
  );
}

export default function HomePage() {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      <PublicLightTheme />
      <BrandThemeApplier />
      <HomePageContent />
    </SessionProvider>
  );
}
