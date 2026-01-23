"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession, SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import HeroSection from "@/components/homepageComponents/HeroSection";
import ContactSection from "@/components/homepageComponents/ContactSection";
import SubscriptionPlansSection from "@/components/homepageComponents/SubscriptionPlansSection";
import { Shield } from "lucide-react";

// Component that handles authentication check and redirect
function HomePageContent() {
  const { status, data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If authenticated, redirect to dashboard
    if (status === "authenticated" && session) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Show redirecting screen if authenticated (while redirect happens)
  if (status === "authenticated" && session) {
    return (
      <div className="min-h-screen font-mono bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-500 rounded-full animate-spin w-16 h-16"></div>
            <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600">
              <Shield size={28} className="text-white" />
            </div>
          </div>
          <span className="text-white text-lg">Redirecting to dashboard...</span>
        </div>
      </div>
    );
  }

  // Show homepage immediately (even while checking authentication)
  return (
    <div className="homepage" style={{ backgroundColor: 'transparent', background: 'transparent' }}>
      <Navbar />
      <HeroSection />
      <div className="bg-gradient-to-br from-gray-50 to-gray-100">
        <ContactSection />
        <SubscriptionPlansSection />
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <SessionProvider
      refetchInterval={5 * 60} // Refetch session every 5 minutes
      refetchOnWindowFocus={true} // Refetch when user returns to window (important for offline → online)
    >
      <HomePageContent />
    </SessionProvider>
  );
}
