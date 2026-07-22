// src/components/homepageComponents/TimelineMapBackground.tsx
"use client";

/**
 * Journey / timeline map backdrop — topographic contour waves.
 * Distinct from hero dots, FAQ isometric lattice, and Architecture square grid.
 */
export function TimelineMapBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="absolute inset-0 bg-linear-to-b from-white via-gray-50 to-white" />

      {/* Topographic contour lines */}
      <svg
        className="absolute inset-0 h-full w-full opacity-[0.4]"
        viewBox="0 0 1440 900"
        preserveAspectRatio="none"
        fill="none"
      >
        {[
          "M0,180 C240,120 480,240 720,180 S1200,80 1440,140",
          "M0,280 C240,220 480,340 720,280 S1200,180 1440,240",
          "M0,380 C240,320 480,440 720,380 S1200,280 1440,340",
          "M0,480 C240,420 480,540 720,480 S1200,380 1440,440",
          "M0,580 C240,520 480,640 720,580 S1200,480 1440,540",
          "M0,680 C240,620 480,740 720,680 S1200,580 1440,640",
          "M0,780 C240,720 480,840 720,780 S1200,680 1440,740",
        ].map((d, i) => (
          <path
            key={d}
            d={d}
            stroke="var(--brand-from)"
            strokeWidth={i % 2 === 0 ? 1.25 : 1}
            strokeOpacity={0.12 + (i % 3) * 0.04}
          />
        ))}
      </svg>

      {/* Fine vertical tick marks (path markers) */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, color-mix(in srgb, var(--brand-to) 18%, transparent) 0 1px, transparent 1px 72px)",
          maskImage:
            "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent 80%)",
        }}
      />

      {/* Soft glows */}
      <div
        className="absolute left-1/4 top-[-10%] h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ background: "var(--brand-from)" }}
      />
      <div
        className="absolute right-1/5 bottom-[-15%] h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ background: "var(--brand-to)" }}
      />
    </div>
  );
}
