"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Shield, LogIn } from "lucide-react";
import { motion } from "framer-motion";

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded ${className}`} />;
}

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  const logoVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: {
      opacity: 1,
      x: 0,
    },
  };

  const navVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
    },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
    },
    hover: {
      scale: 1.05,
    },
    tap: {
      scale: 0.95,
    },
  };

  // Consistent button classes
  const buttonBaseClasses =
    "px-4 py-2 rounded-lg font-medium shadow-md hover:shadow-lg transition-all duration-200 h-10 flex items-center justify-center";

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b border-white/20"
      style={{
        backgroundColor: "transparent",
        background: "transparent",
      }}
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
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-lg shadow-md bg-gradient-to-r from-indigo-600 to-purple-600">
                <Shield size={30} className="text-white" />
              </div>
              <div className="text-2xl font-bold text-white">
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
          ) : session ? (
            <>
              <motion.div
                variants={buttonVariants}
                initial="visible"
                animate="visible"
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Link
                  href="/dashboard"
                  className="items-center hidden h-10 px-4 py-2 font-medium text-white transition-colors duration-200 hover:text-indigo-800 md:block"
                >
                  Dashboard
                </Link>
              </motion.div>
              <motion.button
                onClick={() => signOut({ callbackUrl: "/" })}
                className={`${buttonBaseClasses} bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700`}
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
                    className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium !text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg transition-all duration-200 border border-white/30 shadow-lg"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="!text-white">Sign In</span>
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
