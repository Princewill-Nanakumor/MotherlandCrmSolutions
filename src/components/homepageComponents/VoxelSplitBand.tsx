// src/components/homepageComponents/VoxelSplitBand.tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "@/components/homepageComponents/primitives";
import type { MarketingVoxelSplit } from "@/components/homepageComponents/homepageContent";
import { cn } from "@/lib/utils";

type VoxelSplitBandProps = {
  split: MarketingVoxelSplit;
  className?: string;
};

/**
 * Revolut-style split: copy (headline, body, pill CTA) + art on the other side.
 */
export function VoxelSplitBand({ split, className }: VoxelSplitBandProps) {
  const reduce = useReducedMotion();
  const imageRight = split.imageRight !== false;

  return (
    <section
      className={cn(
        "flex min-h-[60vh] items-center bg-white px-6 py-10 sm:py-12",
        className,
      )}
      aria-labelledby={`voxel-split-${split.id}`}
    >
      <div className="mx-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-2 lg:gap-16">
        <Reveal
          className={cn(
            "max-w-xl",
            imageRight ? "lg:order-1" : "lg:order-2 lg:justify-self-end",
          )}
        >
          <h2
            id={`voxel-split-${split.id}`}
            className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl md:text-[2.5rem] md:leading-[1.1]"
          >
            {split.title}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
            {split.description}
          </p>
          <Link
            href={split.ctaHref}
            className="mt-6 inline-flex items-center justify-center rounded-xl brand-gradient px-7 py-3.5 text-base font-semibold text-white shadow-lg transition-all duration-200 hover:brightness-95 hover:shadow-xl"
          >
            {split.ctaLabel}
          </Link>
        </Reveal>

        <Reveal
          className={cn(imageRight ? "lg:order-2" : "lg:order-1")}
          delay={0.06}
        >
          <motion.div
            className="relative mx-auto aspect-square w-full max-w-sm lg:max-w-md"
            {...(reduce
              ? {}
              : {
                  initial: { opacity: 0.92, y: 10 },
                  whileInView: { opacity: 1, y: 0 },
                  viewport: { once: true, amount: 0.4 },
                  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
                })}
          >
            <Image
              src={split.src}
              alt={split.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 448px"
              className="object-contain object-center"
            />
          </motion.div>
        </Reveal>
      </div>
    </section>
  );
}

export function VoxelSplitStack({
  splits,
}: {
  splits: MarketingVoxelSplit[];
}) {
  return (
    <>
      {splits.map((split) => (
        <VoxelSplitBand key={split.id} split={split} />
      ))}
    </>
  );
}
