"use client";

import React, { useMemo } from "react";

const NAME_STYLE = `
@keyframes holiday-name-fall {
  0% { transform: translate3d(0, 0, 0) rotate(0deg); opacity: 0; }
  8% { opacity: 0.9; }
  85% { opacity: 0.9; }
  100% { transform: translate3d(var(--holiday-name-x, 0px), 115vh, 0) rotate(var(--holiday-name-rot, 0deg)); opacity: 0; }
}
.holiday-name-fall {
  position: absolute;
  top: -10%;
  will-change: transform, opacity;
  animation-name: holiday-name-fall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  user-select: none;
  pointer-events: none;
  white-space: nowrap;
}
`;

export function FallingHolidayNames({
  name,
  accentClassName = "text-rose-600 dark:text-rose-300",
}: {
  /** Shown twice, drifting down at different positions. */
  name: string;
  accentClassName?: string;
}) {
  const labels = useMemo(
    () => [
      { i: 0, left: "18%", delay: 0.8, duration: 14, x: "16px", rot: "-8deg" },
      { i: 1, left: "62%", delay: 5, duration: 16, x: "-16px", rot: "7deg" },
    ],
    [],
  );

  return (
    <div aria-hidden className="absolute inset-0">
      <style>{NAME_STYLE}</style>
      {labels.map((label) => (
        <span
          key={label.i}
          className={`holiday-name-fall rounded-full border border-white/40 bg-white/70 px-3 py-1 text-sm font-semibold shadow-sm backdrop-blur-sm dark:border-white/15 dark:bg-slate-900/55 ${accentClassName}`}
          style={
            {
              left: label.left,
              animationDuration: `${label.duration}s`,
              animationDelay: `${label.delay}s`,
              "--holiday-name-x": label.x,
              "--holiday-name-rot": label.rot,
            } as React.CSSProperties
          }
        >
          {name}
        </span>
      ))}
    </div>
  );
}
