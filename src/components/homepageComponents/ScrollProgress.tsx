// src/components/homepageComponents/ScrollProgress.tsx
"use client";

import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Slim, brand-colored progress bar pinned to the very top of the viewport.
 * Light spring so it tracks the page without feeling a beat behind the wheel.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 380,
    damping: 40,
    mass: 0.2,
  });

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-70 h-0.75 origin-left brand-gradient"
    />
  );
}
