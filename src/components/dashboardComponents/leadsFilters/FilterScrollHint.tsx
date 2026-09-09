// src/components/dashboardComponents/leadsFilters/FilterScrollHint.tsx
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type RefObject,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";

/** Show scroll hint when the option list has more than this many items. */
export const FILTER_SCROLL_HINT_MIN_ITEMS = 4;

/**
 * Fixed option-list height (~4 rows) so selecting a filter (footer) never
 * shrinks the visible list. Row ≈ py-2 + text ≈ 2.25rem → 4 × 2.25rem = 9rem.
 */
export const FILTER_LIST_MAX_HEIGHT_CLASS = "h-36 shrink-0";
export const FILTER_LIST_MAX_HEIGHT_PX = 144; // 9rem

export function useFilterListScrollHint(
  listRef: RefObject<HTMLElement | null>,
  itemCount: number,
  active: boolean,
) {
  const enabled = active && itemCount > FILTER_SCROLL_HINT_MIN_ITEMS;
  const [atBottom, setAtBottom] = useState(false);
  const [canScroll, setCanScroll] = useState(false);

  const update = useCallback(() => {
    const el = listRef.current;
    if (!el || !enabled) {
      setCanScroll(false);
      setAtBottom(false);
      return;
    }
    const overflow = el.scrollHeight > el.clientHeight + 1;
    setCanScroll(overflow);
    // Hysteresis avoids footer/hint mount↔unmount flicker when layout shifts.
    const distanceFromBottom =
      el.scrollHeight - el.clientHeight - el.scrollTop;
    setAtBottom((prev) => {
      if (!overflow) return true;
      if (distanceFromBottom <= 2) return true;
      if (distanceFromBottom >= 28) return false;
      return prev;
    });
  }, [listRef, enabled]);

  const scrollList = useCallback(
    (direction: "up" | "down") => {
      const el = listRef.current;
      if (!el) return;
      if (direction === "up") {
        el.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });
    },
    [listRef],
  );

  useEffect(() => {
    if (!enabled) {
      setCanScroll(false);
      setAtBottom(false);
      return;
    }

    update();
    const el = listRef.current;
    if (!el) return;

    el.addEventListener("scroll", update, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => update())
        : null;
    ro?.observe(el);
    const raf = window.requestAnimationFrame(update);

    return () => {
      el.removeEventListener("scroll", update);
      ro?.disconnect();
      window.cancelAnimationFrame(raf);
    };
  }, [enabled, update, listRef, itemCount]);

  return {
    showHint: enabled && canScroll,
    atBottom,
    scrollList,
  };
}

/**
 * Dedicated strip under the scroll list (not an overlay) so the arrow
 * never covers the last option. Click scrolls the list.
 */
export function FilterScrollHint({
  show,
  atBottom,
  onScrollClick,
}: {
  show: boolean;
  atBottom: boolean;
  onScrollClick: (direction: "up" | "down") => void;
}) {
  const reduceMotion = useReducedMotion();

  if (!show) return null;

  const direction = atBottom ? "up" : "down";

  return (
    <div className="flex shrink-0 items-center justify-center border-t border-gray-200/80 bg-white py-1 dark:border-gray-700/80 dark:bg-gray-800">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onScrollClick(direction);
        }}
        aria-label={direction === "down" ? "Scroll down" : "Scroll up"}
        className="inline-flex cursor-pointer items-center justify-center rounded-md px-3 py-1 hover:bg-[color-mix(in_srgb,var(--brand-from)_14%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand-focus)"
      >
        <motion.span
          key={direction}
          initial={false}
          animate={
            reduceMotion
              ? { y: 0 }
              : { y: direction === "up" ? [0, -4, 0] : [0, 4, 0] }
          }
          transition={{
            duration: 1.15,
            repeat: reduceMotion ? 0 : Infinity,
            ease: "easeInOut",
          }}
          className="inline-flex"
          style={{ color: "var(--brand-from)" }}
        >
          {direction === "up" ? (
            <ChevronUp className="h-4 w-4" strokeWidth={2.5} />
          ) : (
            <ChevronDown className="h-4 w-4" strokeWidth={2.5} />
          )}
        </motion.span>
      </button>
    </div>
  );
}
