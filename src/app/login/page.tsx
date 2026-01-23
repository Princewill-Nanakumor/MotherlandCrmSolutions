"use client";

import { motion } from "framer-motion";
import { SessionProvider, useSession } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import SignInForm from "@/components/authComponents/SignInForm";
import { useEffect, useState } from "react";
import { MessageCircle, Shield } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/components/ui/use-toast";
import { Toaster } from "@/components/ui/toaster";
import { useRouter } from "next/navigation";

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

export default function LoginPage() {
  const { toast } = useToast();
  const [hasShownExpiredToast, setHasShownExpiredToast] = useState(false);

  // Component that renders the login form (shows immediately, even while checking auth)
  function LoginFormContent() {
    const { status } = useSession();

    // Don't render form if authenticated (AuthStateHandler handles redirect)
    if (status === "authenticated") {
      return null;
    }

    // Render login form immediately (even if status is "loading" or "unauthenticated")
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
              className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium !text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg transition-all duration-200 border border-white/30 shadow-lg"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="hidden sm:inline !text-white">Contact Us</span>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Small child component that can safely call `useSession()` because it's
  // rendered inside the `SessionProvider` below.
  // This component handles authentication state and shows appropriate UI
  function AuthStateHandler() {
    const { status, data: session } = useSession();
    const router = useRouter();

    // ✅ FIX: Move useEffect outside conditional - hooks must be called unconditionally
    useEffect(() => {
      // Only redirect if authenticated
      if (status === "authenticated" && session) {
        router.replace("/dashboard");
      }
    }, [status, session, router]);

    // Show redirecting screen if authenticated (while redirect happens)
    if (status === "authenticated" && session) {
      return (
        <div className="flex items-center justify-center min-h-screen p-4 font-mono bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-16 h-16">
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full border-t-blue-400 border-r-purple-500 animate-spin"></div>
              <div className="relative z-10 flex items-center justify-center w-12 h-12 bg-gray-800 rounded-full to-purple-600">
                <Shield size={28} className="text-white" />
              </div>
            </div>
            <span className="text-lg text-white">
              Redirecting to dashboard...
            </span>
          </div>
        </div>
      );
    }

    // If loading or unauthenticated, return null to allow login form to render immediately
    return null;
  }

  // Check if session expired and show toast
  useEffect(() => {
    // Only check once on mount
    if (hasShownExpiredToast) return;

    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const expired = urlParams.get("expired");

      if (expired === "true") {
        toast({
          title: "Session Expired",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        setHasShownExpiredToast(true);

        // Remove the query parameter from URL without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("expired");
        window.history.replaceState({}, "", url.pathname + url.search);
      }
    }
  }, [toast, hasShownExpiredToast]);

  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    // IMMEDIATELY set dark background to prevent white flash
    body.style.setProperty("background-color", "#1a1a1a", "important");
    html.style.setProperty("background-color", "#1a1a1a", "important");

    // Preload the image
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/motherlandImage.jpg";
    document.head.appendChild(link);

    // Apply background image immediately (even if not loaded yet, browser will show it when ready)
    body.style.setProperty(
      "background-image",
      "url('/motherlandImage.jpg')",
      "important",
    );
    body.style.setProperty("background-size", "cover", "important");
    body.style.setProperty("background-position", "center", "important");
    body.style.setProperty("background-repeat", "no-repeat", "important");
    body.style.setProperty("background-attachment", "fixed", "important");

    // Test if image exists and update when loaded
    const testImg = new Image();
    testImg.onload = () => {
      console.log("✅ Background image loaded successfully");
      // Ensure background is applied
      body.style.setProperty(
        "background-image",
        "url('/motherlandImage.jpg')",
        "important",
      );
      body.style.setProperty("background-color", "transparent", "important");
    };
    testImg.onerror = () => {
      console.error(
        "❌ Background image failed to load from /motherlandImage.jpg",
      );
      // Keep dark background if image fails
      body.style.setProperty("background-color", "#1a1a1a", "important");
    };
    testImg.src = "/motherlandImage.jpg";

    html.style.setProperty("background-image", "none", "important");

    // Make all direct children of body transparent
    const makeChildrenTransparent = () => {
      Array.from(body.children).forEach((child) => {
        if (child instanceof HTMLElement) {
          child.style.setProperty(
            "background-color",
            "transparent",
            "important",
          );
        }
      });
    };
    makeChildrenTransparent();

    // Keep background image
    const observer = new MutationObserver(() => {
      body.style.setProperty(
        "background-image",
        "url('/motherlandImage.jpg')",
        "important",
      );
      body.style.setProperty("background-size", "cover", "important");
      body.style.setProperty("background-position", "center", "important");
      body.style.setProperty("background-repeat", "no-repeat", "important");
      body.style.setProperty("background-attachment", "fixed", "important");
      body.style.setProperty("background-color", "transparent", "important");
      html.style.setProperty("background-color", "transparent", "important");
      makeChildrenTransparent();
    });

    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also watch body children changes
    const bodyObserver = new MutationObserver(makeChildrenTransparent);
    bodyObserver.observe(body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      bodyObserver.disconnect();
      // Remove preload link
      const preloadLink = document.querySelector(
        'link[rel="preload"][href="/motherlandImage.jpg"]',
      );
      if (preloadLink) {
        preloadLink.remove();
      }
      // Reset to default white background when leaving login page
      body.style.removeProperty("background-image");
      body.style.removeProperty("background-size");
      body.style.removeProperty("background-position");
      body.style.removeProperty("background-repeat");
      body.style.removeProperty("background-attachment");
      body.style.setProperty("background-color", "#ffffff", "important");
      html.style.setProperty("background-color", "#ffffff", "important");
      html.style.removeProperty("background-image");
    };
  }, []);

  return (
    <>
      <Toaster />
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Set initial dark background to prevent white flash - will be overridden when image loads */
          html, 
          body {
            background-color: #1a1a1a !important;
            background-image: url('/motherlandImage.jpg') !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
          }
          /* Override ALL wrapper divs from providers */
          body > div,
          body > div > div,
          body > div > div > div,
          body > div > div > div > div {
            background-color: transparent !important;
            background: transparent !important;
          }
          /* Ensure navbar doesn't get background */
          nav,
          [class*="Navbar"],
          [class*="navbar"] {
            background-color: transparent !important;
            background: transparent !important;
          }
          /* Ensure form container background */
          div[class*="bg-white/10"],
          [class*="SignInForm"],
          [class*="signInForm"] {
            background-color: rgba(255, 255, 255, 0.1) !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }
          /* Also ensure form wrapper doesn't get background */
          form {
            background-color: transparent !important;
            background: transparent !important;
          }
          /* Input borders */
          input[type="email"],
          input[type="password"] {
            border-color: rgb(209, 213, 219) !important; /* gray-300 */
          }
          /* Checkbox styling */
          input[type="checkbox"] {
            background-color: white !important;
            background: white !important;
            background-image: none !important;
            border-color: rgb(209, 213, 219) !important; /* gray-300 */
            appearance: none !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            border-width: 1px !important;
            border-style: solid !important;
          }
          input[type="checkbox"]:checked {
            background-color: rgb(79, 70, 229) !important; /* indigo-600 */
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
