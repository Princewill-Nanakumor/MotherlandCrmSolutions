"use client";

import React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Shield } from "lucide-react";
import ThemeToggle from "@/components/dashboardComponents/ThemeToggle";
import { motion } from "framer-motion";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
    />
  );
}

export default function Navbar() {
  const { data: session, status } = useSession();

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
  const signInClasses = `${buttonBaseClasses} border-2 border-indigo-600/20 dark:border-indigo-400/20 text-indigo-600 dark:text-indigo-300 hover:border-indigo-600/40 dark:hover:border-indigo-400/40 hover:bg-indigo-50 dark:hover:bg-gray-800`;
  const signUpClasses = `${buttonBaseClasses} bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600`;

  return (
    <motion.nav
      className="px-6 py-4 bg-transparent border-b border-white/20"
      initial="hidden"
      animate="visible"
      variants={navVariants}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <motion.div
          variants={logoVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <Link href="/">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg shadow-md">
                <Shield size={30} className="text-white" />
              </div>
              <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
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
              <Skeleton className="h-10 w-20 hidden md:block" />
              <Skeleton className="h-10 w-24" />
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
                  className="px-4 py-2 h-10 items-center text-indigo-600 dark:text-indigo-300 hover:text-indigo-800 dark:hover:text-indigo-100 font-medium hidden md:block transition-colors duration-200"
                >
                  Dashboard
                </Link>
              </motion.div>
              <motion.button
                onClick={() => signOut({ callbackUrl: "/" })}
                className={`${buttonBaseClasses} bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white hover:from-indigo-700 hover:to-purple-700 dark:hover:from-indigo-600 dark:hover:to-purple-600`}
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
              <motion.div
                variants={buttonVariants}
                initial="visible"
                animate="visible"
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Link href="/login" className={signInClasses}>
                  Sign In
                </Link>
              </motion.div>
            </>
          )}
          <motion.div
            variants={buttonVariants}
            initial="visible"
            animate="visible"
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <ThemeToggle />
          </motion.div>
        </motion.div>
      </div>
    </motion.nav>
  );
}
