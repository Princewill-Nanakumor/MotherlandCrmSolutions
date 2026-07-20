// src/components/user-management/AuthGuard.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { ShieldSpinnerGlyph } from "@/components/dashboardComponents/LeadsLoadingState";
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
      <div className="flex items-center justify-center min-h-screen p-4 bg-background text-foreground">
        <div className="flex items-center gap-3">
          <ShieldSpinnerGlyph />
          <span className="text-lg text-gray-900 dark:text-white">Loading...</span>
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
