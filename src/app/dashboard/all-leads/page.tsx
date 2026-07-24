// src/app/dashboard/all-leads/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LeadsPageContent from "@/components/dashboardComponents/LeadsPageContent";
import { useSearchContext } from "@/context/SearchContext";
import { ShieldSpinnerGlyph } from "@/components/dashboardComponents/LeadsLoadingState";

const AllLeadsPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get search context from layout
  const { searchQuery, setLayoutLoading } = useSearchContext();

  // Handle navigation in useEffect instead of during render
  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/dashboard/all-leads";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <ShieldSpinnerGlyph />
      </div>
    );
  }

  if (
    status === "unauthenticated" ||
    (status === "authenticated" && session?.user?.role !== "ADMIN")
  ) {
    return null;
  }

  return (
    <LeadsPageContent
      searchQuery={searchQuery}
      setLayoutLoading={setLayoutLoading}
    />
  );
};

export default AllLeadsPage;
