"use client";

import Navbar from "@/components/homepageComponents/Navabar";
import HeroSection from "@/components/homepageComponents/HeroSection";
import ContactSection from "@/components/homepageComponents/ContactSection";
import SubscriptionPlansSection from "@/components/homepageComponents/SubscriptionPlansSection";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";

export default function HomePage() {
  return (
    <SessionProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
          <Navbar />
          <HeroSection />
          <ContactSection />
          <SubscriptionPlansSection />
        </div>
      </ThemeProvider>
    </SessionProvider>
  );
}
