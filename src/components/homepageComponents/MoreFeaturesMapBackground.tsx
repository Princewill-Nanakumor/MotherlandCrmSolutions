// src/components/homepageComponents/MoreFeaturesMapBackground.tsx
"use client";

/**
 * Map backdrop for the “more features” section — bold cross-hatch + route
 * arcs + nodes so the pattern is actually visible on light UI.
 */
export function MoreFeaturesMapBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {/* Tinted base so the map isn’t lost on pure white */}
      <div className="absolute inset-0 bg-[color-mix(in_srgb,var(--brand-from)_7%,#f8fafc)]" />

      {/* Strong cross-hatch */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(45deg, color-mix(in srgb, var(--brand-from) 28%, transparent) 1.5px, transparent 1.5px),
            linear-gradient(-45deg, color-mix(in srgb, var(--brand-to) 24%, transparent) 1.5px, transparent 1.5px)
          `,
          backgroundSize: "36px 36px",
          opacity: 0.85,
          maskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 85%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 80% at 50% 45%, black 20%, transparent 85%)",
        }}
      />

      {/* Larger square grid overlay */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(to right, color-mix(in srgb, var(--brand-from) 22%, transparent) 1px, transparent 1px),
            linear-gradient(to bottom, color-mix(in srgb, var(--brand-from) 22%, transparent) 1px, transparent 1px)
          `,
          backgroundSize: "72px 72px",
          opacity: 0.7,
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 50%, black, transparent 80%)",
        }}
      />

      {/* Route arcs */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1200 700"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
      >
        <path
          d="M 80 520 C 260 200, 480 180, 640 340 S 920 560, 1120 280"
          stroke="var(--brand-from)"
          strokeWidth="2"
          strokeOpacity="0.35"
          strokeDasharray="8 12"
        />
        <path
          d="M 140 180 C 360 320, 520 480, 760 360 S 980 200, 1160 420"
          stroke="var(--brand-to)"
          strokeWidth="2"
          strokeOpacity="0.3"
          strokeDasharray="5 10"
        />
      </svg>

      {/* Map nodes */}
      {[
        ["14%", "68%"],
        ["32%", "28%"],
        ["52%", "48%"],
        ["72%", "62%"],
        ["86%", "30%"],
      ].map(([left, top]) => (
        <span
          key={`${left}-${top}`}
          className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full brand-gradient shadow-[0_0_0_6px_color-mix(in_srgb,var(--brand-from)_20%,transparent)]"
          style={{ left, top }}
        />
      ))}

      <div
        className="absolute -left-20 top-1/4 h-96 w-96 rounded-full opacity-40 blur-3xl"
        style={{ background: "var(--brand-from)" }}
      />
      <div
        className="absolute -right-16 bottom-[-10%] h-96 w-96 rounded-full opacity-30 blur-3xl"
        style={{ background: "var(--brand-to)" }}
      />
    </div>
  );
}
