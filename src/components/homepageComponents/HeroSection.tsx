"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

export default function HeroSection() {
  const { data: session, status } = useSession();

  const scrollToContact = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const contactSection = document.getElementById("contact-us");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.1,
      },
    },
  };

  const textVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  };

  const buttonVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1 },
    hover: { scale: 1.05 },
    tap: { scale: 0.95 },
  };

  return (
    <section
      className="relative flex items-center justify-center min-h-screen bg-fixed bg-center bg-no-repeat bg-cover hero-section pt-20"
      style={{
        backgroundImage: "url('/homepageHeroimage.jpg')",
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40" />

      <motion.div
        className="relative z-10 max-w-4xl px-6 mx-auto text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="mb-6 text-4xl font-bold leading-tight text-white sm:text-5xl md:text-6xl"
          variants={textVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Transform Your Business with Powerful CRM Solutions
        </motion.h1>

        <motion.p
          className="max-w-2xl mx-auto mb-8 text-lg leading-relaxed sm:text-xl md:text-2xl text-white/90"
          variants={textVariants}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          Streamline your sales processes, manage leads effectively, and boost
          team productivity with Motherland CRM Solutions.
        </motion.p>

        <motion.div
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          variants={textVariants}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        >
          {status === "loading" ? (
            <div className="w-32 h-12 rounded-lg bg-white/20 animate-pulse" />
          ) : hasAuthorizedSession(status, session) ? (
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 rounded-lg shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
              >
                Go to Dashboard
              </Link>
            </motion.div>
          ) : (
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <a
                href="#contact-us"
                onClick={scrollToContact}
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white transition-all duration-200 rounded-lg shadow-lg cursor-pointer bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 hover:shadow-xl"
              >
                Get Started
              </a>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </section>
  );
}
