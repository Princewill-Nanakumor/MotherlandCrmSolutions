// src/app/dashboard/payment-details/[id]/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import PaymentDetails from "@/components/dashboardComponents/PaymentDetails";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { dashboardPageTitle } from "@/lib/appBranding";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PaymentDetailsPage({ params }: PageProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { shortName } = useAppBranding();

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/dashboard/payment-details";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard/leads");
    }
  }, [status, session, router]);

  // Set page title
  useEffect(() => {
    document.title = dashboardPageTitle(shortName, "Payment Details");
  }, [shortName]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-r from-indigo-600 to-purple-600">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return null;
  }

  return <PaymentDetails params={params} />;
}
