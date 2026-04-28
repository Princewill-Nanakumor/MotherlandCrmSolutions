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
          body.is-signup-page div[class*="bg-white/10"] {
            background-color: rgba(255, 255, 255, 0.1) !important;
            background: rgba(255, 255, 255, 0.1) !important;
          }
          body.is-signup-page form {
            background-color: transparent !important;
            background: transparent !important;
          }
          body.is-signup-page input:not([type="checkbox"]),
          body.is-signup-page textarea,
          body.is-signup-page select,
          body.is-signup-page .react-select__control {
            border-color: rgb(209, 213, 219) !important;
            background-color: white !important;
            color: rgb(17, 24, 39) !important;
          }
          body.is-signup-page input:not([type="checkbox"])::placeholder,
          body.is-signup-page textarea::placeholder,
          body.is-signup-page .react-select__placeholder {
            color: rgb(107, 114, 128) !important;
          }
          body.is-signup-page input:not([type="checkbox"]):-webkit-autofill,
          body.is-signup-page input:not([type="checkbox"]):-webkit-autofill:hover,
          body.is-signup-page input:not([type="checkbox"]):-webkit-autofill:focus {
            -webkit-text-fill-color: rgb(17, 24, 39) !important;
            -webkit-box-shadow: 0 0 0px 1000px white inset !important;
            box-shadow: 0 0 0px 1000px white inset !important;
            transition: background-color 5000s ease-in-out 0s;
          }
          body.is-signup-page .react-select__single-value,
          body.is-signup-page .react-select__input-container,
          body.is-signup-page .react-select__input input {
            color: rgb(17, 24, 39) !important;
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
