"use client";

import Navbar from "@/components/homepageComponents/Navabar";
import HeroSection from "@/components/homepageComponents/HeroSection";
import ContactSection from "@/components/homepageComponents/ContactSection";
import SubscriptionPlansSection from "@/components/homepageComponents/SubscriptionPlansSection";
import { SessionProvider } from "next-auth/react";

export default function HomePage() {
  return (
    <SessionProvider>
      <div className="homepage" style={{ backgroundColor: 'transparent', background: 'transparent' }}>
        <Navbar />
        <HeroSection />
        <div className="bg-gradient-to-br from-gray-50 to-gray-100">
          <ContactSection />
          <SubscriptionPlansSection />
        </div>
      </div>
    </SessionProvider>
  );
}
