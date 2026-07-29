// src/components/homepageComponents/mapAnimationLoop.ts
/**
 * Starts/stops a rAF loop based on element visibility + document visibility.
 * When paused, no frames are scheduled (unlike a spin-wait that keeps enqueuing).
 */
export type MapAnimationGate = {
  /** Call from your tick only after finishing frame work, to schedule the next one. */
  continueLoop: () => void;
  /** Begin the loop if conditions allow (also used on resume). */
  startLoop: () => void;
  /** Tear down observers and cancel any pending frame. */
  dispose: () => void;
  /** True when the loop is allowed to run right now. */
  shouldRun: () => boolean;
};

export function createMapAnimationGate(
  element: Element | null,
  tick: (now: number) => void,
  options?: { rootMargin?: string },
): MapAnimationGate {
  const inViewRef = { current: true };
  const pageVisibleRef = {
    current: typeof document === "undefined" ? true : !document.hidden,
  };
  let raf = 0;
  let disposed = false;

  const shouldRun = () =>
    !disposed && inViewRef.current && pageVisibleRef.current;

  const stopLoop = () => {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };

  const startLoop = () => {
    if (!shouldRun() || raf) return;
    raf = requestAnimationFrame((now) => {
      raf = 0;
      if (!shouldRun()) return;
      tick(now);
    });
  };

  const continueLoop = () => {
    if (!shouldRun() || raf) return;
    raf = requestAnimationFrame((now) => {
      raf = 0;
      if (!shouldRun()) return;
      tick(now);
    });
  };

  const sync = () => {
    if (shouldRun()) startLoop();
    else stopLoop();
  };

  const io =
    element && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(
          ([entry]) => {
            inViewRef.current = Boolean(entry?.isIntersecting);
            sync();
          },
          { rootMargin: options?.rootMargin ?? "80px", threshold: 0 },
        )
      : null;

  if (io && element) io.observe(element);

  const onVisibility = () => {
    pageVisibleRef.current = !document.hidden;
    sync();
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", onVisibility);
  }

  return {
    continueLoop,
    startLoop,
    shouldRun,
    dispose: () => {
      disposed = true;
      stopLoop();
      io?.disconnect();
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisibility);
      }
    },
  };
}
