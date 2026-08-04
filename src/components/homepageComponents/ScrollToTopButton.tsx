"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const SHOW_AFTER_PX = 480;

/**
 * Fixed bottom-right control that appears after leaving the hero and
 * smooth-scrolls back to the top of the marketing page.
 */
export function ScrollToTopButton() {
  const reduceMotion = useReducedMotion();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > SHOW_AFTER_PX);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <AnimatePresence>
      {visible ? (
        <motion.button
          type="button"
          aria-label="Scroll to top"
          onClick={scrollToTop}
          initial={reduceMotion ? false : { opacity: 0, y: 12, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: 12, scale: 0.92 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="fixed z-60 right-4 bottom-4 sm:right-6 sm:bottom-6 inline-flex items-center justify-center w-11 h-11 text-white rounded-full shadow-lg brand-gradient hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-focus) focus-visible:ring-offset-2"
        >
          <ArrowUp className="w-5 h-5" aria-hidden />
        </motion.button>
      ) : null}
    </AnimatePresence>
  );
}
