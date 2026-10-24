// src/components/homepageComponents/Navabar.tsx
"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { Loader2, LogIn, LogOut, Menu, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { hasAuthorizedSession } from "@/lib/sessionUtils";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { cn } from "@/lib/utils";
import {
  MARKETING_NAV_LINKS,
  isMarketingPath,
} from "@/lib/marketingNav";
import { HomepageDashboardMenu } from "@/components/homepageComponents/HomepageDashboardMenu";

const MOBILE_SHEET_SPRING = {
  type: "spring" as const,
  stiffness: 380,
  damping: 36,
  mass: 0.85,
};

const MOBILE_SHEET_EXIT = {
  duration: 0.55,
  ease: [0.4, 0, 0.2, 1] as const,
};

const mobileListVariants: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.035, delayChildren: 0.08 },
  },
};

const mobileItemVariants: Variants = {
  hidden: { opacity: 0, x: -16 },
  show: { opacity: 1, x: 0 },
};

const mobileBlockVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
};

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function Navbar() {
  const { displayName, shortName } = useAppBranding();
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuId = useId();
  const isAuthed = hasAuthorizedSession(status, session);

  const showMarketingLinks = isMarketingPath(pathname);
  // Light marketing pages use solid chrome; auth hero pages stay translucent.
  const useSolidChrome = !isAuthHeroPage;

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

  const closeMenu = () => setMenuOpen(false);

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

  const iconButtonClass = cn(
    "inline-flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-300 shrink-0",
    useSolidChrome
      ? "border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)] bg-white text-(--brand-from) shadow-sm hover:brand-soft-bg"
      : "border-white/30 bg-white/15 text-white backdrop-blur-md hover:bg-white/25",
  );

  const mobileNavLinkClass = (href: string) =>
    cn(
      "flex items-center h-11 px-3 text-sm font-medium transition-colors rounded-xl hover:brand-soft-bg hover:text-(--brand-from)",
      pathname === href
        ? "text-(--brand-from) brand-soft-bg"
        : "text-gray-800",
    );

  const showSignUp = !isAuthed && !isSignupPage;
  const showSignIn = !isAuthed && !isLoginPage;

  return (
    <nav
      data-chrome={useSolidChrome ? "solid" : "transparent"}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-2",
        useSolidChrome
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200"
          : "bg-transparent border-b border-white/20",
      )}
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
              {/* Mobile uses shortName (no trailing “Solution”). */}
              <span className="lg:hidden">{shortName}</span>
              <span className="hidden lg:inline">{displayName}</span>
            </div>
          </Link>
        </div>

        <div className="hidden flex-1 items-center justify-center min-w-0 gap-1 lg:flex xl:gap-1.5">
          {showMarketingLinks
            ? MARKETING_NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    textLinkClass,
                    "px-2.5 py-1.5 rounded-lg",
                    pathname === link.href &&
                      "text-(--brand-from) brand-soft-bg",
                  )}
                >
                  {link.label}
                </Link>
              ))
            : null}
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
                <HomepageDashboardMenu
                  solid={useSolidChrome}
                  linkClassName={textLinkClass}
                />
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

        {!menuOpen && (
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={false}
              aria-controls={menuId}
              onClick={() => setMenuOpen(true)}
              className={iconButtonClass}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id={menuId}
            key="mobile-nav-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            className="fixed inset-0 z-50 flex h-dvh flex-col bg-white lg:hidden"
            initial={{ opacity: 0, x: "-100%" }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{
              opacity: 0,
              y: "-100%",
              transition: MOBILE_SHEET_EXIT,
            }}
            transition={MOBILE_SHEET_SPRING}
          >
            <motion.div
              className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 border-b border-gray-100"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06, duration: 0.22 }}
            >
              <Link
                href="/"
                onClick={closeMenu}
                className="flex items-center min-w-0 gap-2.5"
              >
                <MotherlandLogo
                  className="w-10 h-10 rounded-2xl shrink-0"
                  title={`${displayName} Logo`}
                />
                <p className="text-base font-semibold text-gray-900 truncate">
                  {shortName}
                </p>
              </Link>
              <button
                type="button"
                aria-label="Close menu"
                onClick={closeMenu}
                className={cn(
                  iconButtonClass,
                  "border-[color-mix(in_srgb,var(--brand-from)_28%,transparent)] bg-white text-(--brand-from) shadow-sm hover:brand-soft-bg",
                )}
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>

            <motion.div
              className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 space-y-1"
              initial="hidden"
              animate="show"
              variants={mobileListVariants}
            >
              {showMarketingLinks && (
                <div className="space-y-1 border-b border-gray-100 pb-2">
                  {MARKETING_NAV_LINKS.map((link) => (
                    <motion.div
                      key={link.href}
                      variants={mobileItemVariants}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                    >
                      <Link
                        href={link.href}
                        onClick={closeMenu}
                        className={mobileNavLinkClass(link.href)}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}

              {status === "loading" ? (
                <div className="px-1 py-1 space-y-2">
                  <Skeleton className="w-full h-11" />
                  <Skeleton className="w-full h-11" />
                </div>
              ) : isAuthed ? (
                <motion.div
                  className="space-y-1"
                  variants={mobileBlockVariants}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {isNavigating ? (
                    <div className="flex items-center justify-center h-11 rounded-xl brand-soft-bg">
                      <Loader2 className="w-5 h-5 animate-spin brand-icon" />
                    </div>
                  ) : (
                    <HomepageDashboardMenu
                      variant="mobile"
                      solid
                      linkClassName={textLinkClass}
                      onNavigate={closeMenu}
                    />
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center justify-center w-full gap-2 h-11 text-sm font-medium text-gray-800 transition-colors border border-gray-200 rounded-xl bg-gray-50 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  className="flex flex-col gap-2 pt-1"
                  variants={mobileBlockVariants}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {showSignUp && (
                    <Link
                      href="/signup"
                      onClick={closeMenu}
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
                      onClick={closeMenu}
                      className="flex items-center justify-center gap-2 h-11 text-sm font-medium text-white rounded-xl brand-gradient hover:brightness-95"
                    >
                      <LogIn className="w-4 h-4" />
                      Sign In
                    </Link>
                  )}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
