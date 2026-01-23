// src/app/dashboard/all-leads/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LeadsPageContent from "@/components/dashboardComponents/LeadsPageContent";
import { useSearchContext } from "@/context/SearchContext";
import { Shield } from "lucide-react";

const AllLeadsPage: React.FC = () => {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Get search context from layout
  const { searchQuery, setLayoutLoading } = useSearchContext();

  // Handle navigation in useEffect instead of during render
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full">
            <Shield size={28} className="text-white" />
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

  return (
    <LeadsPageContent
      searchQuery={searchQuery}
      setLayoutLoading={setLayoutLoading}
    />
  );
};

export default AllLeadsPage;
