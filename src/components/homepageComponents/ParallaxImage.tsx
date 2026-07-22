// src/components/homepageComponents/ParallaxImage.tsx
"use client";

import Image from "next/image";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/libs/utils";

/**
 * Full-bleed image that drifts vertically as it passes through the viewport.
 * The inner layer is over-sized so the parallax translate never exposes edges.
 * Motion is disabled under `prefers-reduced-motion`.
 */
export function ParallaxImage({
  src,
  alt = "",
  className,
  strength = 90,
  priority = false,
  sizes = "100vw",
}: {
  src: string;
  alt?: string;
  className?: string;
  strength?: number;
  priority?: boolean;
  sizes?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rawY = useTransform(
    scrollYProgress,
    [0, 1],
    [-strength / 2, strength / 2],
  );
  const y = useSpring(rawY, { stiffness: 90, damping: 30, mass: 0.4 });

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <motion.div
        style={reduce ? undefined : { y }}
        className="absolute inset-x-0 -top-[8%] h-[116%]"
      >
        <Image
          src={src}
          alt={alt}
          fill
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
      </motion.div>
    </div>
  );
}
