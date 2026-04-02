"use client";

import { signOut } from "next-auth/react";

type AppRouterLike = {
  replace: (href: string) => void;
  refresh: () => void;
};

/** Clears the session without showing the NextAuth /api/auth/signout confirmation page. */
export async function signOutWithoutInterstitial(
  callbackUrl: string,
  router?: AppRouterLike,
) {
  const result = await signOut({ redirect: false, callbackUrl });
  const target = result?.url ?? callbackUrl;
  if (router) {
    router.replace(target);
    router.refresh();
  } else if (typeof window !== "undefined") {
    window.location.assign(target);
  }
}
