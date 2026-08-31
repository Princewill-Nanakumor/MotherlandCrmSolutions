import { useEffect, useState } from "react";

type DeferAfterPaintOptions = {
  /** Max wait before running deferred work even if the browser stays busy. */
  timeoutMs?: number;
};

/**
 * Returns true after the first paint so route-critical data (leads, users)
 * can load before Ably, reminders, and other non-blocking shell work.
 */
export function useDeferAfterPaint(options?: DeferAfterPaintOptions) {
  const timeoutMs = options?.timeoutMs ?? 1500;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const markReady = () => {
      if (!cancelled) setReady(true);
    };

    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(markReady, { timeout: timeoutMs });
      return () => {
        cancelled = true;
        cancelIdleCallback(id);
      };
    }

    const raf = requestAnimationFrame(() => {
      const timer = setTimeout(markReady, 0);
      return () => clearTimeout(timer);
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [timeoutMs]);

  return ready;
}
