// src/components/ui/FloatingElements.tsx
"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface FloatingElementProps {
  children: ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  y?: number;
  morphType?: "circle" | "square" | "triangle";
}

export default function FloatingElement({
  children,
  className = "",
  duration = 6,
  delay = 0,
  y = 20,
  morphType = "circle",
}: FloatingElementProps) {
  const morphAnimations = {
    circle: {
      borderRadius: ["50%", "30%", "50%"],
      rotate: [0, 180, 360],
    },
    square: {
      borderRadius: ["0%", "50%", "0%"],
      scale: [1, 1.2, 1],
    },
    triangle: {
      borderRadius: ["0%", "50%", "0%"],
      rotate: [0, 90, 180, 270, 360],
    },
  };

  return (
    <motion.div
      className={className}
      animate={{
        y: [0, -y, 0],
        ...morphAnimations[morphType],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.div>
  );
}
