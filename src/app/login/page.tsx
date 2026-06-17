"use client";

import { motion } from "framer-motion";
import { SessionProvider, useSession } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import SignInForm from "@/components/authComponents/SignInForm";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  LoadingSpinner,
  LoadingSpinnerWithCaption,
} from "@/components/dashboardComponents/LeadsLoadingState";
import {
  clearIntentionalSignOutMarkers,
  clearSessionExpiryMarkers,
  hasAuthorizedSession,
  shouldBlockLoginAutoRedirect,
  shouldClearStaleSessionOnLoginPage,
  shouldForceLoginLanding,
} from "@/lib/sessionUtils";
import { getAuthHeroGlassFieldsCss } from "@/lib/authHeroGlassFieldsCss";
import { disconnectAblyRealtimeClient } from "@/libs/ablyClient";
import { disconnectAblyLeadRealtimeClient } from "@/libs/ablyLeadClient";
import { signOut } from "next-auth/react";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const sectionVariants = {
  hidden: {
    opacity: 0,
    y: 50,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

function LoadingScreen() {
  return <LoadingSpinner />;
}

function RedirectingScreen() {
  return (
    <LoadingSpinnerWithCaption caption="Redirecting to dashboard…" />
  );
}

// Defined at module scope so LoginPage re-renders (e.g. when toast dismisses) don't remount these and retrigger motion animations
function LoginFormContent() {
  const { status, data: session } = useSession();
  // Hide form when authed and not stuck clearing stale session (expired landing + old client session)
  if (
    hasAuthorizedSession(status, session) &&
    !shouldBlockLoginAutoRedirect(status, session)
  ) {
    return null;
  }
  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundColor: "transparent",
        background: "transparent",
        position: "relative",
        zIndex: 1,
      }}
    >
      <motion.div
        className="relative z-10 min-h-screen"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ backgroundColor: "transparent" }}
      >
        <motion.div
          variants={sectionVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Navbar />
        </motion.div>
        <motion.div
          variants={sectionVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4 py-8"
        >
          <div className="w-full max-w-sm sm:max-w-md md:max-w-lg">
            <SignInForm />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

function AuthStateHandler() {
  const { status, data: session } = useSession();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const [sessionCleanupDone, setSessionCleanupDone] = useState(false);
  const redirectStartedRef = useRef(false);

  const forceLoginLanding = shouldForceLoginLanding();

  // Clear stale client session when we landed after expiry / server blip.
  useEffect(() => {
    if (!forceLoginLanding) {
      setSessionCleanupDone(true);
      return;
    }

    let cancelled = false;

    void (async () => {
      if (status === "loading") return;

      try {
        if (shouldClearStaleSessionOnLoginPage(status, session)) {
          await signOut({ redirect: false });
          disconnectAblyRealtimeClient();
          disconnectAblyLeadRealtimeClient();
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;
      clearSessionExpiryMarkers();
      setSessionCleanupDone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [forceLoginLanding, status, session]);

  // If session stays "loading" (e.g. /api/auth/session slow or fails), show form after 2.5s
  useEffect(() => {
    if (status !== "loading") return;
    const t = setTimeout(() => {
      setLoadingTimedOut(true);
      if (forceLoginLanding) {
        clearSessionExpiryMarkers();
        setSessionCleanupDone(true);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [status, forceLoginLanding]);

  const sessionUserId = session?.user?.id;

  useEffect(() => {
    if (!hasAuthorizedSession(status, session)) {
      redirectStartedRef.current = false;
      return;
    }
    if (shouldBlockLoginAutoRedirect(status, session)) return;
    if (redirectStartedRef.current) return;
    redirectStartedRef.current = true;

    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const callbackUrl = params?.get("callbackUrl");
    const path = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
    const url = `${window.location.origin}${path}`;

    // Full page navigation so the session cookie is always sent (router.replace can race middleware).
    window.location.replace(url);
  }, [status, sessionUserId, session]);

  const forceLoginSpinner =
    forceLoginLanding &&
    !sessionCleanupDone &&
    !shouldBlockLoginAutoRedirect(status, session);
  // After expiry landing, wait for stale-session cleanup before showing the form
  if (forceLoginSpinner) return <LoadingScreen />;
  // After expiry landing, show form (not spinner) even while session is loading
  if (status === "loading" && !shouldForceLoginLanding() && !loadingTimedOut) {
    return <LoadingScreen />;
  }

  if (
    hasAuthorizedSession(status, session) &&
    !shouldBlockLoginAutoRedirect(status, session)
  ) {
    return <RedirectingScreen />;
  }
  return null;
}

export default function LoginPage() {
  const { toast } = useToast();
  const hasShownExpiredToastRef = useRef(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Clear one-time marker used to suppress expiry redirects after manual sign-out.
  useEffect(() => {
    if (typeof window === "undefined") return;
    clearIntentionalSignOutMarkers();
  }, []);

  // Check if session expired and show toast (from ?expired=true or localStorage.sessionExpired)
  useEffect(() => {
    if (hasShownExpiredToastRef.current) return;
    if (typeof window === "undefined") return;

    // Post-signin handshake race: SignInForm sets `auth:navigating` right
    // before window.location.replace(). If we still got here with an
    // `expired` flag, it's a stale marker from before the click — clear it
    // silently instead of telling the user their session expired.
    let navigatingAfterSignIn = false;
    try {
      navigatingAfterSignIn =
        sessionStorage.getItem("auth:navigating") === "1";
    } catch {
      /* ignore */
    }

    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get("expired") === "true";
    const fromStorage = localStorage.getItem("sessionExpired") === "true";

    if (navigatingAfterSignIn) {
      hasShownExpiredToastRef.current = true;
      if (fromStorage) {
        try {
          localStorage.removeItem("sessionExpired");
        } catch {
          /* ignore */
        }
      }
      if (fromUrl) {
        urlParams.delete("expired");
        const qs = urlParams.toString();
        const nextUrl = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash ?? ""}`;
        window.history.replaceState({}, "", nextUrl);
      }
      return;
    }

    if (!fromUrl && !fromStorage) return;

    hasShownExpiredToastRef.current = true;
    if (fromStorage) {
      localStorage.removeItem("sessionExpired");
    }
    toast({
      title: "Session Expired",
      description: "Your session has expired. Please log in again.",
      variant: "destructive",
    });
  }, [toast]);

  // Use layout effect so class is applied before first paint (avoids white flash).
  // All login visuals are scoped to .is-login-page via the <style> below;
  // we do not mutate body.children or set inline styles on body/html, so cleanup
  // is trivial and dashboard/theme are never left with login styles.
  useLayoutEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    body.classList.add("is-login-page");
    html.classList.add("is-login-page");

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/motherlandImage.jpg";
    document.head.appendChild(link);

    return () => {
      body.classList.remove("is-login-page");
      html.classList.remove("is-login-page");
      const preloadLink = document.querySelector(
        'link[rel="preload"][href="/motherlandImage.jpg"]',
      );
      if (preloadLink) preloadLink.remove();
    };
  }, []);

  if (!mounted) {
    return (
      <>
        <Toaster />
        <LoadingScreen />
      </>
    );
  }

  return (
    <>
      <Toaster />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Login page only: scoped so removing .is-login-page restores theme/globals */
          html.is-login-page {
            background-color: #1a1a1a !important;
            background-image: none !important;
          }
          body.is-login-page {
            background-color: #0f0f0f !important;
            /* Dark overlay on top of hero image for readability */
            background-image:
              linear-gradient(
                rgba(0, 0, 0, 0.58),
                rgba(0, 0, 0, 0.52)
              ),
              url('/motherlandImage.jpg') !important;
            background-size: cover, cover !important;
            background-position: center, center !important;
            background-repeat: no-repeat, no-repeat !important;
            background-attachment: fixed, fixed !important;
          }
          body.is-login-page > div,
          body.is-login-page > div > div,
          body.is-login-page > div > div > div,
          body.is-login-page > div > div > div > div {
            background-color: transparent !important;
            background: transparent !important;
          }
          body.is-login-page nav,
          body.is-login-page [class*="Navbar"],
          body.is-login-page [class*="navbar"] {
            background-color: transparent !important;
            background: transparent !important;
          }
          body.is-login-page div[class*="bg-white/10"],
          body.is-login-page [class*="SignInForm"],
          body.is-login-page [class*="signInForm"] {
            background-color: rgba(255, 255, 255, 0.1) !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }
          body.is-login-page form {
            background-color: transparent !important;
            background: transparent !important;
          }
          ${getAuthHeroGlassFieldsCss()}
          body.is-login-page input[type="checkbox"] {
            background-color: white !important;
            background: white !important;
            background-image: none !important;
            border-color: rgb(209, 213, 219) !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            border-width: 1px !important;
            border-style: solid !important;
          }
          body.is-login-page input[type="checkbox"]:checked {
            background-color: rgb(79, 70, 229) !important;
            background: rgb(79, 70, 229) !important;
            background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E") !important;
            background-size: contain !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            border-color: rgb(79, 70, 229) !important;
          }
        `,
        }}
      />

      <SessionProvider
        refetchInterval={5 * 60} // Refetch session every 5 minutes
        refetchOnWindowFocus={true} // Refetch when user returns to window (important for offline → online)
      >
        <AuthStateHandler />
        <LoginFormContent />
      </SessionProvider>
    </>
  );
}
