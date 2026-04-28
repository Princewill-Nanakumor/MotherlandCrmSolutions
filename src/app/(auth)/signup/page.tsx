"use client";

import { motion } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import SignUpForm from "@/components/authComponents/SignUpForm";
import { useEffect, useLayoutEffect, useState } from "react";

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
  hidden: { opacity: 0, y: 50 },
  visible: { opacity: 1, y: 0 },
};

export default function SignUpPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    body.classList.add("is-signup-page");
    html.classList.add("is-signup-page");

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/motherlandImage.jpg";
    document.head.appendChild(link);

    return () => {
      body.classList.remove("is-signup-page");
      html.classList.remove("is-signup-page");
      const preloadLink = document.querySelector(
        'link[rel="preload"][href="/motherlandImage.jpg"]',
      );
      if (preloadLink) preloadLink.remove();
    };
  }, []);

  if (!mounted) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          html.is-signup-page {
            background-color: #1a1a1a !important;
            background-image: none !important;
          }
          body.is-signup-page {
            background-color: #1a1a1a !important;
            background-image: url('/motherlandImage.jpg') !important;
            background-size: cover !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-attachment: fixed !important;
          }
          body.is-signup-page > div,
          body.is-signup-page > div > div,
          body.is-signup-page > div > div > div,
          body.is-signup-page > div > div > div > div {
            background-color: transparent !important;
            background: transparent !important;
          }
          body.is-signup-page nav,
          body.is-signup-page [class*="Navbar"],
          body.is-signup-page [class*="navbar"] {
            background-color: transparent !important;
            background: transparent !important;
          }
        `,
        }}
      />
      <SessionProvider
        refetchInterval={5 * 60}
        refetchOnWindowFocus={true}
      >
        <div className="relative min-h-screen">
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
              className="flex justify-center px-4 pt-32 pb-10 sm:pt-36"
            >
              <div className="w-full max-w-sm sm:max-w-md md:max-w-lg">
                <SignUpForm />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </SessionProvider>
    </>
  );
}
