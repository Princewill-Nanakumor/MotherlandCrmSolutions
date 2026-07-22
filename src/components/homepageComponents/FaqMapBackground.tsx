// src/components/homepageComponents/FaqMapBackground.tsx
"use client";

/**
 * FAQ section map backdrop — isometric diamond lattice + soft concentric
 * rings. Distinct from the hero dot/route map and Architecture’s square grid.
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

      {/* Concentric “radar” rings */}
      <div className="absolute left-1/2 top-[42%] h-168 w-2xl -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--brand-from)_12%,transparent)]" />
      <div className="absolute left-1/2 top-[42%] h-112 w-md -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--brand-from)_16%,transparent)]" />
      <div className="absolute left-1/2 top-[42%] h-64 w-[16rem] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[color-mix(in_srgb,var(--brand-to)_20%,transparent)]" />

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
