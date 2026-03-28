"use client";

import { motion } from "framer-motion";
import { SessionProvider, useSession } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import SignInForm from "@/components/authComponents/SignInForm";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { MessageCircle, Shield } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

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

// Loading screen component
function LoadingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 font-mono bg-linear-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full to-purple-600">
            <Shield size={28} className="text-white" />
          </div>
        </div>
        <span className="text-lg text-white">Loading...</span>
      </div>
    </div>
  );
}

// Redirecting screen component
function RedirectingScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen p-4 font-mono bg-linear-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
      <div className="flex items-center gap-3">
        <div className="relative flex items-center justify-center w-16 h-16">
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
          <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full to-purple-600">
            <Shield size={28} className="text-white" />
          </div>
        </div>
        <span className="text-lg text-white">Redirecting to dashboard...</span>
      </div>
    </div>
  );
}

// Defined at module scope so LoginPage re-renders (e.g. when toast dismisses) don't remount these and retrigger motion animations
function LoginFormContent() {
  const { status, data: session } = useSession();
  const isExpiredLanding =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("expired") === "true";
  // Show form when no valid user OR ?expired=true (sign-out in flight can leave status loading)
  if (hasAuthorizedSession(status, session) && !isExpiredLanding) return null;
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
        <motion.div
          className="fixed z-50 bottom-6 right-4 sm:right-6 md:right-8"
          variants={sectionVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Link
            href="/"
            className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white! bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg transition-all duration-200 border border-white/30 shadow-lg"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden sm:inline text-white!">Contact Us</span>
          </Link>
        </motion.div>
      </motion.div>
    </div>
  );
}

function AuthStateHandler() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  const isExpiredLanding =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("expired") === "true";

  // If session stays "loading" (e.g. /api/auth/session slow or fails in production), show form after 2.5s so user can sign in
  useEffect(() => {
    if (status !== "loading") return;
    const t = setTimeout(() => setLoadingTimedOut(true), 2500);
    return () => clearTimeout(t);
  }, [status]);

  useEffect(() => {
    if (!hasAuthorizedSession(status, session)) return;
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const callbackUrl = params?.get("callbackUrl");
    const target = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dashboard";
    router.replace(target);
    // Fallback: if client nav doesn't complete (e.g. production), full navigate after 2s
    const fallback = setTimeout(() => {
      if (typeof window !== "undefined" && window.location.pathname === "/login") {
        window.location.href = target;
      }
    }, 2000);
    return () => clearTimeout(fallback);
  }, [status, session, router]);

  // When landing with ?expired=true, show form; if session stuck loading, show form after timeout
  if (status === "loading" && !isExpiredLanding && !loadingTimedOut) return <LoadingScreen />;

  if (hasAuthorizedSession(status, session)) {
    return <RedirectingScreen />;
  }
  return null;
}

export default function LoginPage() {
  const { toast } = useToast();
  const hasShownExpiredToastRef = useRef(false);

  // Check if session expired and show toast (from ?expired=true or localStorage.sessionExpired)
  useEffect(() => {
    if (hasShownExpiredToastRef.current) return;
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get("expired") === "true";
    const fromStorage = localStorage.getItem("sessionExpired") === "true";

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
            background-color: #1a1a1a !important;
            background-image: url('/motherlandImage.jpg') !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
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
          body.is-login-page input[type="email"],
          body.is-login-page input[type="password"] {
            border-color: rgb(209, 213, 219) !important;
          }
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
