// src/components/homepageComponents/FaqMapBackground.tsx
"use client";

import {
  TravelingMapRoutes,
  type MapRoute,
  type MapTravelerDef,
} from "@/components/homepageComponents/TravelingMapRoutes";

/**
 * CSS rings share one center (50% / 42%):
 *   large  h-168 w-2xl  → 42rem = 672px → r = 336
 *   mid    h-112 w-md   → 28rem = 448px → r = 224
 *   small  h-64  16rem  → 16rem = 256px → r = 128
 *
 * SVG sits in the same box as the large ring with a matching square
 * viewBox so node coordinates land on the CSS borders.
 */
const SIZE = 672;
const CX = SIZE / 2;
const CY = SIZE / 2;

const FAQ_RINGS = [
  { id: "faq-ring-lg", r: 336 },
  { id: "faq-ring-md", r: 224 },
  { id: "faq-ring-sm", r: 128 },
] as const;

function circlePath(cx: number, cy: number, r: number) {
  return `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 a ${r} ${r} 0 1 0 ${-r * 2} 0`;
}

const FAQ_ROUTES: MapRoute[] = FAQ_RINGS.map((ring) => ({
  id: ring.id,
  d: circlePath(CX, CY, ring.r),
  stroke: "transparent",
  strokeOpacity: 0,
  strokeDasharray: "none",
  strokeWidth: 1,
}));

const FAQ_TRAVELERS: MapTravelerDef[] = [
  { id: "fr0a", routeIndex: 0, durationMs: 22000, delayMs: 0, r: 4 },
  { id: "fr0b", routeIndex: 0, durationMs: 28000, delayMs: 5000, r: 3 },
  { id: "fr1a", routeIndex: 1, durationMs: 18000, delayMs: 800, r: 4 },
  { id: "fr1b", routeIndex: 1, durationMs: 24000, delayMs: 6500, r: 3 },
  { id: "fr2a", routeIndex: 2, durationMs: 14000, delayMs: 1500, r: 3.5 },
  { id: "fr2b", routeIndex: 2, durationMs: 20000, delayMs: 7000, r: 2.8 },
];

/**
 * FAQ section map backdrop — isometric diamond lattice + radar rings
 * with nodes that travel along those rings.
 */
export function FaqMapBackground() {
  return (
    <div
      aria-hidden
      className="absolute inset-0 overflow-hidden pointer-events-none"
    >
      <div className="absolute inset-0 bg-linear-to-b from-gray-50 via-white to-gray-50" />

      {/* Isometric / diamond lattice */}
      <div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(60deg, color-mix(in srgb, var(--brand-from) 14%, transparent) 1px, transparent 1px),
            linear-gradient(-60deg, color-mix(in srgb, var(--brand-from) 14%, transparent) 1px, transparent 1px),
            linear-gradient(0deg, color-mix(in srgb, var(--brand-to) 10%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "56px 96px, 56px 96px, 56px 32px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 78%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black, transparent 78%)",
        }}
      />

      {/* Concentric radar rings + nodes on the same geometry */}
      <div className="absolute left-1/2 top-[42%] h-168 w-2xl -translate-x-1/2 -translate-y-1/2">
        <div className="absolute inset-0 rounded-full border border-[color-mix(in_srgb,var(--brand-from)_12%,transparent)]" />
        <div className="absolute left-1/2 top-1/2 h-112 w-md -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--brand-from)_16%,transparent)]" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--brand-to)_20%,transparent)]" />

        <TravelingMapRoutes
          routes={FAQ_ROUTES}
          travelers={FAQ_TRAVELERS}
          gradientId="faq-node-glow"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full overflow-visible"
        />
      </div>

      {/* Soft brand glows */}
      <div
        className="absolute left-[-10%] top-0 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-from)" }}
      />
      <div
        className="absolute right-[-8%] bottom-[-10%] h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--brand-to)" }}
      />
    </div>
  );
}
