// src/app/dashboard/leads/page.tsx
"use client";

import UserLeadsContent from "@/components/leads/UserLeadsContent";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UserLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect admins away from this page
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      router.push("/");
      return;
    }

    if (session?.user?.role === "ADMIN") {
      router.push("/dashboard");
      return;
    }
  }, [session, status, router]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="!text-gray-700 dark:!text-white">Loading...</p>
      </div>
    );
  }

  // Don't render anything if user is unauthenticated or admin
  if (status === "unauthenticated" || session?.user?.role === "ADMIN") {
    return null;
  }

  // Only render for non-admin users
  return (
    <>
      <UserLeadsContent />

      {/* Development: React Query DevTools for debugging */}
      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
          position="bottom"
        />
      )}
    </>
  );
}
