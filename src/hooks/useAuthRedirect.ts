// src/hooks/useAuthRedirect.ts
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

export function useAuthRedirect() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!hasAuthorizedSession(status, session) || !session?.user) return;
    if (session.user.role === "ADMIN") {
      router.push("/dashboard");
    } else {
      router.push("/dashboard/leads");
    }
  }, [session, status, router]);

  return { session, status };
}
