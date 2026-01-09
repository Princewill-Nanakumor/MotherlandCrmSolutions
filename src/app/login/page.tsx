"use client";

import { motion } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/dashboardComponents/Theme-Provider";
import Navbar from "@/components/homepageComponents/Navabar";
import SignInForm from "@/components/authComponents/SignInForm";
import { useEffect } from "react";
import { MessageCircle } from "lucide-react";
import Link from "next/link";

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
  useEffect(() => {
    const body = document.body;
    const html = document.documentElement;

    body.setAttribute("data-homepage", "true");
    html.setAttribute("data-homepage", "true");

    body.classList.remove("bg-background");
    html.classList.remove("bg-background");

    body.style.setProperty("background", "transparent", "important");
    html.style.setProperty("background", "transparent", "important");
    body.style.setProperty("background-color", "transparent", "important");
    html.style.setProperty("background-color", "transparent", "important");

    // Apply background image directly to body to guarantee visibility
    body.style.setProperty(
      "background-image",
      "url('/motherlandImage.jpg')",
      "important"
    );
    body.style.setProperty("background-size", "cover", "important");
    body.style.setProperty("background-position", "center", "important");
    body.style.setProperty("background-repeat", "no-repeat", "important");

    const testImg = new Image();
    testImg.src = "/motherlandImage.jpg";
    testImg.onload = () => console.log("✅ Background image loaded successfully");

    return () => {
      body.removeAttribute("data-homepage");
      html.removeAttribute("data-homepage");
      body.style.removeProperty("background");
      html.style.removeProperty("background");
      body.style.removeProperty("background-color");
      html.style.removeProperty("background-color");
      body.style.removeProperty("background-image");
      body.style.removeProperty("background-size");
      body.style.removeProperty("background-position");
      body.style.removeProperty("background-repeat");
    };
  }, []);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          html[data-homepage="true"],
          html[data-homepage="true"] body {
            background: transparent !important;
            background-color: transparent !important;
          }
          body[data-homepage="true"] {
            background: transparent !important;
            background-color: transparent !important;
          }
        `,
        }}
      />
      <SessionProvider>
        <ThemeProvider>
          <div
            className="min-h-screen relative overflow-hidden"
            style={{
              backgroundColor: "transparent",
              background: "transparent",
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
                className="fixed bottom-6 right-4 sm:right-6 md:right-8 z-50"
                variants={sectionVariants}
                transition={{ duration: 0.6, ease: "easeOut" }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Link
                  href="/"
                  className="flex items-center space-x-2 px-4 py-2.5 text-sm font-medium text-white bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-lg transition-all duration-200 border border-white/30 shadow-lg"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Contact Us</span>
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </ThemeProvider>
      </SessionProvider>
    </>
  );
}

