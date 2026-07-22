/**
 * Cross-platform, viewport-aware UI density.
 *
 * - Laptop-sized windows keep a denser Mac/Windows baseline
 *   (Mac ~0.9, Windows ~0.8) so browser 100% matches prior zoom prefs.
 * - Larger screens ease toward 1.0 so the UI doesn't look tiny / under-fit.
 * - Optional localStorage override still wins when set.
 */

export const UI_ZOOM_STORAGE_KEY = "motherland-ui-zoom";

export const UI_ZOOM_MAC = 0.9;
export const UI_ZOOM_WINDOWS = 0.8;
export const UI_ZOOM_DEFAULT = 0.9;

/** Below this width, apply the full platform density baseline. */
const LAPTOP_WIDTH = 1440;
/** Around here, density is mostly relaxed. */
const DESKTOP_WIDTH = 1920;
/** At/above this, use full scale (1). */
const LARGE_DESKTOP_WIDTH = 2560;
/** Short viewports stay denser (taskbar / OS scaling / split windows). */
const SHORT_HEIGHT = 820;

export function detectUiZoomPlatform(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): "windows" | "mac" | "other" {
  const ua = userAgent || "";
  if (/Windows/i.test(ua)) return "windows";
  if (/Mac OS X|Macintosh/i.test(ua)) return "mac";
  return "other";
}

export function getPlatformUiZoom(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): number {
  const platform = detectUiZoomPlatform(userAgent);
  if (platform === "windows") return UI_ZOOM_WINDOWS;
  if (platform === "mac") return UI_ZOOM_MAC;
  return UI_ZOOM_DEFAULT;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

/**
 * Map viewport size onto a scale between the platform baseline and 1.0.
 * Bigger screens → closer to 1 (fits properly without looking shrunk).
 */
export function getViewportUiZoom(
  platformBase: number,
  width =
    typeof window !== "undefined"
      ? window.innerWidth || document.documentElement.clientWidth || LAPTOP_WIDTH
      : LAPTOP_WIDTH,
  height =
    typeof window !== "undefined"
      ? window.innerHeight ||
        document.documentElement.clientHeight ||
        SHORT_HEIGHT
      : SHORT_HEIGHT,
): number {
  let scale: number;

  if (width <= LAPTOP_WIDTH) {
    scale = platformBase;
  } else if (width >= LARGE_DESKTOP_WIDTH) {
    scale = 1;
  } else if (width >= DESKTOP_WIDTH) {
    // 1920 → mostly relaxed, 2560 → 1
    const mid = lerp(platformBase, 1, 0.75);
    scale = lerp(
      mid,
      1,
      (width - DESKTOP_WIDTH) / (LARGE_DESKTOP_WIDTH - DESKTOP_WIDTH),
    );
  } else {
    // 1440 → platform base, 1920 → mostly relaxed
    const mid = lerp(platformBase, 1, 0.75);
    scale = lerp(platformBase, mid, (width - LAPTOP_WIDTH) / (DESKTOP_WIDTH - LAPTOP_WIDTH));
  }

  // Short / cramped windows keep the denser laptop feel.
  if (height < SHORT_HEIGHT) {
    scale = Math.min(scale, platformBase);
  }

  // Round for stable CSS + dataset comparisons.
  return Math.round(clamp(scale, 0.75, 1.05) * 1000) / 1000;
}

/** @deprecated Prefer getPlatformUiZoom + getViewportUiZoom */
export function getDefaultUiZoom(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): number {
  return getViewportUiZoom(getPlatformUiZoom(userAgent));
}

export function resolveUiZoom(
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "",
): number {
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(UI_ZOOM_STORAGE_KEY);
      if (stored) {
        const parsed = Number.parseFloat(stored);
        if (Number.isFinite(parsed) && parsed >= 0.7 && parsed <= 1.1) {
          return parsed;
        }
      }
    } catch {
      // ignore
    }
  }
  return getViewportUiZoom(getPlatformUiZoom(userAgent));
}

/** Apply density before/during paint. Safe to call repeatedly. */
export function applyUiZoom(zoom = resolveUiZoom()): void {
  if (typeof document === "undefined") return;
  const value = String(zoom);
  const root = document.documentElement;
  root.style.setProperty("--app-ui-scale", value);
  root.dataset.uiZoom = value;
  // Clear any previous CSS zoom experiments so they don't stack.
  root.style.removeProperty("zoom");
}

/** Inline boot logic kept in sync with resolveUiZoom (no module imports). */
export const UI_ZOOM_BOOT_SCRIPT = `(function(){try{var KEY="motherland-ui-zoom";var ua=navigator.userAgent||"";var z;try{var s=localStorage.getItem(KEY);if(s){var p=parseFloat(s);if(isFinite(p)&&p>=0.7&&p<=1.1)z=p;}}catch(e){}if(z==null){var base=/Windows/i.test(ua)?0.8:(/Mac OS X|Macintosh/i.test(ua)?0.9:0.9);var w=window.innerWidth||document.documentElement.clientWidth||1440;var h=window.innerHeight||document.documentElement.clientHeight||820;var clamp=function(n,a,b){return Math.min(b,Math.max(a,n));};var lerp=function(a,b,t){return a+(b-a)*clamp(t,0,1);};var scale;if(w<=1440)scale=base;else if(w>=2560)scale=1;else if(w>=1920){var mid=lerp(base,1,0.75);scale=lerp(mid,1,(w-1920)/(2560-1920));}else{var mid2=lerp(base,1,0.75);scale=lerp(base,mid2,(w-1440)/(1920-1440));}if(h<820)scale=Math.min(scale,base);z=Math.round(clamp(scale,0.75,1.05)*1000)/1000;}var r=document.documentElement;r.style.setProperty("--app-ui-scale",String(z));r.dataset.uiZoom=String(z);r.style.removeProperty("zoom");}catch(e){}})();`;
