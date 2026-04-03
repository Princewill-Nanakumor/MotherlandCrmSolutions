// src/components/user-management/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Shield } from "lucide-react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export function AuthGuard({
  children,
  requiredRole = "ADMIN",
  redirectTo = "/dashboard",
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!hasAuthorizedSession(status, session)) {
      setIsRedirecting(true);
      router.push("/login");
      return;
    }

    // Check session expiry (session.expires from token.exp)
    if (session?.expires && new Date() >= new Date(session.expires)) {
      setIsRedirecting(true);
      localStorage.setItem("sessionExpired", "true");
      void signOutWithoutInterstitial(
        `/login?expired=true&callbackUrl=${encodeURIComponent(pathname ?? "/dashboard")}`,
        router,
      );
      return;
    }

    if (session!.user!.role !== requiredRole) {
      setIsRedirecting(true);
      router.push(redirectTo);
      toast({
        title: "Unauthorized",
        description: "You don't have permission to access this page",
        variant: "destructive",
      });
    }
  }, [
    status,
    session,
    session?.expires,
    router,
    pathname,
    toast,
    requiredRole,
    redirectTo,
  ]);

  // Show loading screen while checking authentication or redirecting
  if (status === "loading" || isRedirecting) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 font-mono bg-linear-to-r from-gray-900 via-blue-900 to-purple-900 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-16 h-16">
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
            <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-linear-to-r from-indigo-600 to-purple-600">
              <Shield size={28} className="text-white" />
            </div>
          </div>
          <span className="text-lg text-white">Loading...</span>
        </div>
      </div>
    );
  }

  if (
    !hasAuthorizedSession(status, session) ||
    session!.user.role !== requiredRole
  ) {
    return null;
  }

  return <>{children}</>;
}
