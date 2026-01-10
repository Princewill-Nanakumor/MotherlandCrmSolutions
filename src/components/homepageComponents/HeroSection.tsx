"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";

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
      className="hero-section relative min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat bg-fixed"
      style={{
        backgroundImage: "url('/homepageHeroimage.jpg')",
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/50" />

      <motion.div
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          className="text-4xl sm:text-5xl md:text-6xl font-bold !text-white mb-6 leading-tight"
          variants={textVariants}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          Transform Your Business with Powerful CRM Solutions
        </motion.h1>

        <motion.p
          className="text-lg sm:text-xl md:text-2xl !text-white/90 mb-8 max-w-2xl mx-auto leading-relaxed"
          variants={textVariants}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.2 }}
        >
          Streamline your sales processes, manage leads effectively, and boost
          team productivity with Motherland CRM Solutions.
        </motion.p>

        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          variants={textVariants}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
        >
          {status === "loading" ? (
            <div className="h-12 w-32 bg-white/20 rounded-lg animate-pulse" />
          ) : session ? (
            <motion.div
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 hover:shadow-xl"
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
                className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold text-lg shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 hover:shadow-xl cursor-pointer"
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
