// src/components/homepageComponents/Navabar.tsx
"use client";

import React, { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { LayoutDashboard, Loader2, LogIn, LogOut, Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { cn } from "@/libs/utils";
import { scrollToHomepageSection } from "@/components/homepageComponents/scrollToHomepageSection";

const HOME_SECTION_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function Navbar() {
  const { displayName } = useAppBranding();
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const isSignupPage = pathname === "/signup";
  const isAuthHeroPage =
    isLoginPage ||
    isSignupPage ||
    pathname === "/forgot-password" ||
    (pathname?.startsWith("/reset-password/") ?? false) ||
    (pathname?.startsWith("/verify-email/") ?? false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const isAuthed = hasAuthorizedSession(status, session);

  const isHomePage = pathname === "/";
  // Light homepage hero needs solid chrome; auth hero pages stay translucent.
  const useSolidChrome = (isScrolled || isHomePage) && !isAuthHeroPage;

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      setIsScrolled(window.scrollY > heroHeight * 0.95);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem("auth:navigating");
      setIsNavigating(v === "1");
    } catch {
      /* ignore */
    }

    const onNav = (e: Event) => {
      try {
        const d = (e as CustomEvent).detail;
        if (typeof d === "boolean") setIsNavigating(d);
        else setIsNavigating(sessionStorage.getItem("auth:navigating") === "1");
      } catch {
        setIsNavigating(sessionStorage.getItem("auth:navigating") === "1");
      }
    };

    window.addEventListener("auth:navigating", onNav as EventListener);
    window.addEventListener("storage", onNav as EventListener);
    return () => {
      window.removeEventListener("auth:navigating", onNav as EventListener);
      window.removeEventListener("storage", onNav as EventListener);
    };
  }, []);

  useEffect(() => {
    if (isAuthed) {
      try {
        sessionStorage.removeItem("auth:navigating");
      } catch {
        /* ignore */
      }
      setIsNavigating(false);
    }
  }, [isAuthed]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    // Lock whichever element actually scrolls: the window (body) on the public
    // homepage, and the custom density scroller elsewhere in the app.
    const densityRoot = document.getElementById("app-density-root");
    const previousBodyOverflow = document.body.style.overflow;
    const previousRootOverflow = densityRoot?.style.overflow ?? "";
    document.body.style.overflow = "hidden";
    if (densityRoot) densityRoot.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      if (densityRoot) densityRoot.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOutWithoutInterstitial("/", router, { intentional: true });
  };

  const textLinkClass = cn(
    "text-sm font-medium transition-colors duration-300",
    useSolidChrome
      ? "text-gray-800 hover:text-(--brand-from)"
      : "text-white hover:text-white/85",
  );

  const softButtonClass = cn(
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 backdrop-blur-md shadow-lg",
    useSolidChrome
      ? "text-(--brand-from) brand-soft-bg hover:brightness-95 border brand-soft-border"
      : "text-white! bg-white/20 hover:bg-white/30 border border-white/30",
  );

  const primaryButtonClass =
    "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg shadow-md transition-all duration-200 brand-gradient text-white! hover:brightness-95";

  const showSignUp = !isAuthed && !isSignupPage;
  const showSignIn = !isAuthed && !isLoginPage;

  return (
    <motion.nav
      data-chrome={useSolidChrome ? "solid" : "transparent"}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-2",
        useSolidChrome
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200"
          : "bg-transparent border-b border-white/20",
      )}
      initial={{ y: "-100%" }}
      animate={{ y: 0 }}
      transition={{ duration: 0.85, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between gap-3 mx-auto max-w-7xl">
        <div className="min-w-0">
          <Link href="/" className="flex items-center min-w-0 gap-2">
            <MotherlandLogo
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl shrink-0"
              title={`${displayName} Logo`}
            />
            <div
              className={cn(
                "text-base sm:text-lg md:text-2xl font-bold truncate max-w-38 sm:max-w-56 md:max-w-72 lg:max-w-none transition-colors duration-300",
                useSolidChrome ? "text-gray-900" : "text-white!",
              )}
            >
              {displayName}
            </div>
          </Link>
        </div>

        <div className="items-center hidden gap-4 lg:flex">
          {status === "loading" ? (
            <>
              <Skeleton className="w-20 h-10" />
              <Skeleton className="w-24 h-10" />
            </>
          ) : isAuthed ? (
            <>
              {isNavigating ? (
                <div
                  className={cn(
                    "flex items-center px-4 py-2.5 rounded-lg h-10",
                    useSolidChrome
                      ? "brand-soft-bg"
                      : "text-white! bg-white/20",
                  )}
                >
                  <Loader2
                    className={cn(
                      "w-5 h-5 animate-spin",
                      useSolidChrome ? "brand-icon" : "text-white",
                    )}
                  />
                </div>
              ) : (
                <Link href="/dashboard" className={textLinkClass}>
                  Dashboard
                </Link>
              )}
              <button
                type="button"
                onClick={handleSignOut}
                className={primaryButtonClass}
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              {showSignUp && (
                <Link
                  href="/signup"
                  className={isLoginPage ? primaryButtonClass : softButtonClass}
                >
                  Sign Up
                </Link>
              )}
              {showSignIn && (
                <Link href="/login" className={primaryButtonClass}>
                  <LogIn className="w-4 h-4 text-white!" />
                  <span className="text-white!">Sign In</span>
                </Link>
              )}
            </>
          )}
        </div>

        <div className="flex items-center lg:hidden">
          <button
            ref={menuButtonRef}
            type="button"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={() => setMenuOpen((open) => !open)}
            className={cn(
              "inline-flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-300",
              useSolidChrome
                ? "border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)] bg-white text-(--brand-from) shadow-sm hover:brand-soft-bg"
                : "border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/25",
            )}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu overlay"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px] lg:hidden"
            onClick={() => setMenuOpen(false)}
          />

          <div
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Account menu"
            className="fixed top-17 right-3 left-3 z-50 overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand-from)_22%,transparent)] bg-white shadow-2xl sm:left-auto sm:right-4 sm:w-88 lg:hidden"
          >
            <div className="px-4 pt-4 pb-3 border-b border-gray-100">
              <p className="text-xs font-semibold tracking-wide uppercase text-(--brand-from)">
                {isHomePage ? "Menu" : "Account"}
              </p>
              <p className="mt-1 text-sm font-semibold text-gray-900 truncate">
                {displayName}
              </p>
            </div>

            <div className="p-3 space-y-2">
              {isHomePage && (
                <div className="pb-2 mb-1 space-y-1 border-b border-gray-100">
                  {HOME_SECTION_LINKS.map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="flex items-center h-10 px-3 text-sm font-medium text-gray-800 transition-colors rounded-xl hover:brand-soft-bg hover:text-(--brand-from)"
                      onClick={(event) => {
                        event.preventDefault();
                        setMenuOpen(false);
                        // Let the menu close / unlock body scroll first.
                        window.requestAnimationFrame(() => {
                          scrollToHomepageSection(link.href);
                        });
                      }}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
              {status === "loading" ? (
                <div className="px-1 py-1 space-y-2">
                  <Skeleton className="w-full h-11" />
                  <Skeleton className="w-full h-11" />
                </div>
              ) : isAuthed ? (
                <>
                  {isNavigating ? (
                    <div className="flex items-center justify-center h-11 rounded-xl brand-soft-bg">
                      <Loader2 className="w-5 h-5 animate-spin brand-icon" />
                    </div>
                  ) : (
                    <Link
                      href="/dashboard"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 h-11 rounded-xl text-sm font-medium text-white brand-gradient hover:brightness-95"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Go to Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center justify-center w-full gap-2 h-11 text-sm font-medium text-gray-800 transition-colors border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  {showSignUp && (
                    <Link
                      href="/signup"
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-center h-11 text-sm font-medium rounded-xl hover:brightness-95",
                        isLoginPage
                          ? "text-white brand-gradient"
                          : "text-(--brand-from) border brand-soft-border brand-soft-bg",
                      )}
                    >
                      Sign Up
                    </Link>
                  )}
                  {showSignIn && (
                    <Link
                      href="/login"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center justify-center gap-2 h-11 text-sm font-medium text-white rounded-xl brand-gradient hover:brightness-95"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </motion.nav>
  );
}
