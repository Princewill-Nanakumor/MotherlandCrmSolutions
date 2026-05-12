// src/app/dashboard/leads/page.tsx
"use client";

import UserLeadsContent from "@/components/leads/UserLeadsContent";
import dynamic from "next/dynamic";
import { useEffect } from "react";

const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools,
    ),
  { ssr: false },
);
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function UserLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Redirect admins away from this page
  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated") {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : "/dashboard/leads";
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
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
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-700 dark:text-white">Loading...</p>
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
