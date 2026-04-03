"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { signOutWithoutInterstitial } from "@/lib/signOutClient";
import { Loader2, LogIn } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const heroHeight = window.innerHeight;
      setIsScrolled(window.scrollY > heroHeight * 0.95);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem("auth:navigating");
      setIsNavigating(v === "1");
    } catch {}

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
    if (hasAuthorizedSession(status, session)) {
      try {
        sessionStorage.removeItem("auth:navigating");
      } catch {}
      setIsNavigating(false);
    }
  }, [status, session]);

  const logoVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { opacity: 1, x: 0 },
  };

  const navVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  const buttonBaseClasses =
    "px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 h-10 flex items-center justify-center";

  const handleSignOut = async () => {
    await signOutWithoutInterstitial("/", router);
  };

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 transition-all duration-300 ${
        isScrolled
          ? "bg-white/95 backdrop-blur-md shadow-md border-b border-gray-200"
          : "bg-transparent border-b border-white/20"
      }`}
      initial="hidden"
      animate="visible"
      variants={navVariants}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between mx-auto max-w-7xl">
        <motion.div
          variants={logoVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Link href="/">
            <div className="flex items-center space-x-1">
              <div className="relative w-20 h-20 overflow-hidden ">
                <Image
                  src="/motherlandlogo.png"
                  alt="Motherland CRM Solutions Logo"
                  fill
                  sizes="80px"
                  className="object-contain"
                  priority={!isLoginPage}
                />
              </div>
              <div
                className={`text-lg font-bold md:text-2xl transition-colors duration-300 ${
                  isScrolled ? "text-gray-900" : "text-white"
                }`}
              >
                Motherland CRM Solutions
              </div>
            </div>
          </Link>
        </motion.div>

        <motion.div
          className="flex items-center space-x-4"
          variants={navVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {status === "loading" ? (
            <>
              <Skeleton className="hidden w-20 h-10 md:block" />
              <Skeleton className="w-24 h-10" />
            </>
          ) : hasAuthorizedSession(status, session) ? (
            <>
              {isNavigating ? (
                <motion.div
                  variants={buttonVariants}
                  initial="visible"
                  animate="visible"
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <div
                    className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-lg h-10 ${
                      isScrolled
                        ? "text-gray-900 bg-indigo-50"
                        : "text-white! bg-white/20"
                    }`}
                  >
                    <Loader2 className="w-5 h-5 animate-spin" />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  variants={buttonVariants}
                  initial="visible"
                  animate="visible"
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Link
                    href="/dashboard"
                    className={`items-center hidden h-10 px-4 py-2 font-medium transition-colors duration-300 md:block ${
                      isScrolled
                        ? "text-gray-900 hover:text-indigo-600"
                        : "text-white hover:text-indigo-200"
                    }`}
                  >
                    Dashboard
                  </Link>
                </motion.div>
              )}

              <motion.button
                type="button"
                onClick={handleSignOut}
                className={`${buttonBaseClasses} bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700`}
                variants={buttonVariants}
                initial="visible"
                animate="visible"
                whileHover="hover"
                whileTap="tap"
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                Sign Out
              </motion.button>
            </>
          ) : (
            <>
              {!isLoginPage && (
                <motion.div
                  variants={buttonVariants}
                  initial="visible"
                  animate="visible"
                  transition={{ duration: 0.4, ease: "easeOut" }}
                >
                  <Link
                    href="/login"
                    className={`flex items-center space-x-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 backdrop-blur-md shadow-lg ${
                      isScrolled
                        ? "text-gray-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200"
                        : "text-white! bg-white/20 hover:bg-white/30 border border-white/30"
                    }`}
                  >
                    <LogIn className="w-4 h-4" />
                    <span
                      className={isScrolled ? "text-gray-900" : "text-white!"}
                    >
                      Sign In
                    </span>
                  </Link>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </motion.nav>
  );
}
