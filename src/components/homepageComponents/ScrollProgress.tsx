// src/components/homepageComponents/ScrollProgress.tsx
"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { motion, useScroll, useSpring } from "framer-motion";

/**
 * Slim, brand-colored progress bar pinned to the very top of the viewport.
 * Light spring so it tracks the page without feeling a beat behind the wheel.
 */
export function ScrollProgress() {
  const pathname = usePathname();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 380,
    damping: 40,
    mass: 0.2,
  });

  useEffect(() => {
    // Shell stays mounted across marketing routes — jump so the bar doesn't
    // stay fully filled from the previous page's scroll depth.
    scaleX.jump(0);

    const sync = () => {
      const maxScroll =
        document.documentElement.scrollHeight - window.innerHeight;
      scaleX.jump(maxScroll <= 1 ? 0 : scrollYProgress.get());
    };

    const raf = window.requestAnimationFrame(sync);
    const t = window.setTimeout(sync, 50);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(t);
    };
  }, [pathname, scaleX, scrollYProgress]);

  return (
    <motion.div
      aria-hidden
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-70 h-0.75 origin-left brand-gradient"
    />
  );
}
