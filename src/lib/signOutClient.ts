"use client";

import { signOut } from "next-auth/react";

type AppRouterLike = {
  replace: (href: string) => void;
  refresh: () => void;
};

export type SignOutWithoutInterstitialOptions = {
  /** User clicked Logout — dashboard layout must not treat this as session expiry (`?expired=true`). */
  intentional?: boolean;
};

/** Clears the session without showing the NextAuth /api/auth/signout confirmation page. */
export async function signOutWithoutInterstitial(
  callbackUrl: string,
  router?: AppRouterLike,
  options?: SignOutWithoutInterstitialOptions,
) {
  if (options?.intentional && typeof window !== "undefined") {
    try {
      sessionStorage.setItem("auth:intentionalSignOut", "1");
    } catch {
      /* ignore */
    }
  }
  const result = await signOut({ redirect: false, callbackUrl });
  const target = result?.url ?? callbackUrl;
  if (router) {
    router.replace(target);
    router.refresh();
  } else if (typeof window !== "undefined") {
    window.location.assign(target);
  }
}
