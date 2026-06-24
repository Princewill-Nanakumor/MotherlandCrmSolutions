"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import BillingManager from "@/components/billing/BillingManager";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { dashboardPageTitle } from "@/lib/appBranding";

export default function BillingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { shortName } = useAppBranding();

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/dashboard/billing";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard/leads");
    }
  }, [status, session, router]);

  useEffect(() => {
    document.title = dashboardPageTitle(shortName, "Billing");
  }, [shortName]);

  if (
    status === "loading" ||
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return null;
  }

  return <BillingManager />;
}
