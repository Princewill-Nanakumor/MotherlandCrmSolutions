// Shared hash navigation for homepage section links (hero, nav, footer).
// Uses window.scrollTo — scrollIntoView can no-op when <main overflow-x-clip>
// becomes a scrollport that isn't actually constrained.

export const HOMEPAGE_REVEAL_BELOW_FOLD = "homepage:reveal-below-fold";

const NAV_OFFSET_PX = 5.5 * 16; // matches .homepage [id] { scroll-margin-top: 5.5rem }

function sectionTop(id: string): number | null {
  const target = document.getElementById(id);
  if (!target) return null;
  return (
    target.getBoundingClientRect().top + window.scrollY - NAV_OFFSET_PX
  );
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Smooth-scroll to a homepage section. Forces lazy InViewSwap sections to
 * mount first so height changes above the target don't leave the scroll short.
 */
export function scrollToHomepageSection(hash: string): void {
  const id = hash.replace(/^#/, "");
  if (!id) return;

  // Wake every below-fold InViewSwap so layout above #pricing (etc.) is final.
  window.dispatchEvent(new Event(HOMEPAGE_REVEAL_BELOW_FOLD));

  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";

  const scrollNow = () => {
    const top = sectionTop(id);
    if (top == null) return;
    window.scrollTo({ top: Math.max(0, top), behavior });
  };

  // Two frames: let React commit swapped fallbacks, then measure.
  requestAnimationFrame(() => {
    requestAnimationFrame(scrollNow);
  });

  // Dynamic imports above the target can still change height after the first
  // scroll — nudge again once chunks have had time to paint.
  window.setTimeout(() => {
    const top = sectionTop(id);
    if (top == null) return;
    if (Math.abs(window.scrollY - top) > 48) {
      window.scrollTo({ top: Math.max(0, top), behavior });
    }
  }, 450);

  if (window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }
}
