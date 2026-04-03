// /Users/safeconnection/Downloads/motherlandCrmSolution/src/app/(auth)/signin/page.tsx

"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Shield } from "lucide-react";
import SignInForm from "@/components/authComponents/SignInForm";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

export default function SignInPage() {
  const { status, data: session } = useSession();
  const router = useRouter();

  // ✅ FIX: Move useEffect outside conditional - hooks must be called unconditionally
  useEffect(() => {
    if (hasAuthorizedSession(status, session)) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  // Show loading screen while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen font-mono bg-linear-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-500 rounded-full animate-spin w-16 h-16"></div>
            <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-r from-indigo-600 to-purple-600">
              <Shield size={28} className="text-white" />
            </div>
          </div>
          <span className="text-white text-lg">Loading...</span>
        </div>
      </div>
    );
  }

  // Show redirecting screen if authenticated with a real user id
  if (hasAuthorizedSession(status, session)) {
    return (
      <div className="min-h-screen font-mono bg-linear-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950 flex items-center justify-center p-4">
        <div className="flex items-center gap-3">
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 border-r-purple-500 rounded-full animate-spin w-16 h-16"></div>
            <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-r from-indigo-600 to-purple-600">
              <Shield size={28} className="text-white" />
            </div>
          </div>
          <span className="text-white text-lg">Redirecting to dashboard...</span>
        </div>
      </div>
    );
  }

  // Only show form when unauthenticated
  return <SignInForm />;
}
