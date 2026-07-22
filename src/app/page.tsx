"use client";

import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import HeroSection from "@/components/homepageComponents/HeroSection";
import ContactSection from "@/components/homepageComponents/ContactSection";
import SubscriptionPlansSection from "@/components/homepageComponents/SubscriptionPlansSection";
import { BrandThemeApplier } from "@/components/BrandThemeApplier";
import { PublicLightTheme } from "@/components/PublicLightTheme";

// Homepage is available to everyone (logged in or not); Navbar can show different links based on session
function HomePageContent() {
  return (
    <div
      className="homepage [font-family:var(--brand-font-body)]"
      style={{ backgroundColor: "transparent", background: "transparent" }}
    >
      <Navbar />
      <HeroSection />
      <div className="bg-linear-to-br from-gray-50 to-gray-100">
        <ContactSection />
        <SubscriptionPlansSection />
      </div>
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
