"use client";

import { Suspense, useEffect, useLayoutEffect, useState } from "react";
import React from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/homepageComponents/Navabar";
import { VerifyEmailContent } from "@/components/authComponents/VerifyEmailContent";
import { getAuthHeroBackdropChromeCss } from "@/lib/authHeroBackdropChromeCss";
import { getAuthHeroGlassFieldsCss } from "@/lib/authHeroGlassFieldsCss";

const PAGE_CLASS = "is-verify-email-page";

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

function VerifyEmailWrapper({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = React.use(params);
  return <VerifyEmailContent token={resolvedParams.token} />;
}

function VerifyEmailFallback() {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-white/20 bg-white/10 p-8 shadow-xl sm:rounded-2xl">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <div
          className="absolute inset-0 h-16 w-16 animate-spin rounded-full border-4 border-transparent"
          style={{
            borderTopColor: "var(--brand-from)",
            borderRightColor: "var(--brand-to)",
          }}
        />
      </div>
      <p className="text-sm text-white/90">Loading verification…</p>
    </div>
  );
}

export default function VerifyEmailPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    body.classList.add(PAGE_CLASS);
    html.classList.add(PAGE_CLASS);

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/motherlandImage.jpg";
    document.head.appendChild(link);

    return () => {
      body.classList.remove(PAGE_CLASS);
      html.classList.remove(PAGE_CLASS);
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
          ${getAuthHeroBackdropChromeCss(PAGE_CLASS)}
          ${getAuthHeroGlassFieldsCss()}
        `,
        }}
      />
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
              <Suspense fallback={<VerifyEmailFallback />}>
                <VerifyEmailWrapper params={params} />
              </Suspense>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </>
  );
}
