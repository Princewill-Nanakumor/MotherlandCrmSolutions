"use client";

import { use } from "react";
import { motion } from "framer-motion";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/components/homepageComponents/Navabar";
import { NewPasswordForm } from "@/components/authComponents/NewPasswordForm";
import { useEffect, useLayoutEffect, useState } from "react";
import { getAuthHeroBackdropChromeCss } from "@/lib/authHeroBackdropChromeCss";
import { getAuthHeroGlassFieldsCss } from "@/lib/authHeroGlassFieldsCss";

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

export default function ResetPasswordPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const resolvedParams = use(params);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    const body = document.body;
    const html = document.documentElement;
    body.classList.add("is-auth-reset-page");
    html.classList.add("is-auth-reset-page");

    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = "/motherlandImage.jpg";
    document.head.appendChild(link);

    return () => {
      body.classList.remove("is-auth-reset-page");
      html.classList.remove("is-auth-reset-page");
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
          ${getAuthHeroBackdropChromeCss("is-auth-reset-page")}
          ${getAuthHeroGlassFieldsCss()}
        `,
        }}
      />
      <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
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
                <NewPasswordForm token={resolvedParams.token} />
              </div>
            </motion.div>
          </motion.div>
        </div>
      </SessionProvider>
    </>
  );
}
