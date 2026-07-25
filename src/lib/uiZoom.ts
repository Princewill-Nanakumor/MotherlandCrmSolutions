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

/** Marketing homepage uses native window scroll (no density transform). */
export function isPublicNativeScrollPath(pathname: string): boolean {
  return pathname === "/" || pathname === "";
}

export function isDashboardPath(pathname: string): boolean {
  return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
}

/** Apply density before/during paint. Safe to call repeatedly. */
export function applyUiZoom(zoom = resolveUiZoom()): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // Homepage (and other public-native-scroll pages) must stay at 1 — never
  // apply laptop density or the hero/stats strip jump 0.8 → 1 after hydrate.
  if (root.classList.contains("public-native-scroll")) {
    root.style.setProperty("--app-ui-scale", "1");
    root.dataset.uiZoom = "1";
    root.style.removeProperty("zoom");
    return;
  }
  const value = String(zoom);
  root.style.setProperty("--app-ui-scale", value);
  root.dataset.uiZoom = value;
  // Clear any previous CSS zoom experiments so they don't stack.
  root.style.removeProperty("zoom");
}

/**
 * Instantly zero scroll on window + density root. Prefer scrollTop assignment
 * over scrollTo — CSS `scroll-behavior: smooth` can leave mid-scroll offsets
 * that clip the dashboard navbar until a hard refresh.
 */
function resetAppScrollPositions(density: HTMLElement | null): void {
  const html = document.documentElement;
  const previousBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = "auto";

  window.scrollTo(0, 0);
  html.scrollTop = 0;
  document.body.scrollTop = 0;

  if (density) {
    const previousDensityBehavior = density.style.scrollBehavior;
    density.style.scrollBehavior = "auto";
    density.scrollTop = 0;
    density.scrollLeft = 0;
    density.scrollTo(0, 0);
    density.style.scrollBehavior = previousDensityBehavior;
  }

  html.style.scrollBehavior = previousBehavior;
}

/**
 * Keep html scroll mode in sync with the route. Client navigations from `/`
 * can leave `public-native-scroll` (or a scrolled density root) behind, which
 * makes the dashboard navbar scroll out of view until a hard refresh.
 */
export function syncAppScrollMode(pathname: string): void {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const density = document.getElementById("app-density-root");
  const wasPublic = root.classList.contains("public-native-scroll");
  const isPublic = isPublicNativeScrollPath(pathname);
  const isDashboard = isDashboardPath(pathname);

  if (isPublic) {
    root.classList.add("public-native-scroll");
    root.classList.remove("app-density-lock");
    root.style.setProperty("--app-ui-scale", "1");
    root.dataset.uiZoom = "1";
    root.style.removeProperty("zoom");
    return;
  }

  root.classList.remove("public-native-scroll");
  root.classList.toggle("app-density-lock", isDashboard);
  applyUiZoom();

  // Clear leftover inline overflow locks (e.g. homepage mobile menu).
  document.body.style.removeProperty("overflow");
  density?.style.removeProperty("overflow");

  if (wasPublic || isDashboard) {
    resetAppScrollPositions(density);
    // Layout can settle a frame later (session gate / shell mount).
    requestAnimationFrame(() => resetAppScrollPositions(density));
  }
}

/**
 * Inline boot logic kept in sync with resolveUiZoom (no module imports).
 * On `/`, force scale 1 + `public-native-scroll` before first paint so the
 * hero never flashes at the laptop density scale.
 * On `/dashboard*`, set `app-density-lock` before paint so the density root
 * cannot scroll the navbar out of view before React hydrates.
 */
export const UI_ZOOM_BOOT_SCRIPT = `(function(){try{var KEY="motherland-ui-zoom";var ua=navigator.userAgent||"";var path=location.pathname||"/";var isPublic=path==="/"||path==="";var r=document.documentElement;if(isPublic){r.classList.add("public-native-scroll");r.classList.remove("app-density-lock");r.style.setProperty("--app-ui-scale","1");r.dataset.uiZoom="1";r.style.removeProperty("zoom");return;}if(path==="/dashboard"||path.indexOf("/dashboard/")===0){r.classList.add("app-density-lock");}var z;try{var s=localStorage.getItem(KEY);if(s){var p=parseFloat(s);if(isFinite(p)&&p>=0.7&&p<=1.1)z=p;}}catch(e){}if(z==null){var base=/Windows/i.test(ua)?0.8:(/Mac OS X|Macintosh/i.test(ua)?0.9:0.9);var w=window.innerWidth||document.documentElement.clientWidth||1440;var h=window.innerHeight||document.documentElement.clientHeight||820;var clamp=function(n,a,b){return Math.min(b,Math.max(a,n));};var lerp=function(a,b,t){return a+(b-a)*clamp(t,0,1);};var scale;if(w<=1440)scale=base;else if(w>=2560)scale=1;else if(w>=1920){var mid=lerp(base,1,0.75);scale=lerp(mid,1,(w-1920)/(2560-1920));}else{var mid2=lerp(base,1,0.75);scale=lerp(base,mid2,(w-1440)/(1920-1440));}if(h<820)scale=Math.min(scale,base);z=Math.round(clamp(scale,0.75,1.05)*1000)/1000;}r.style.setProperty("--app-ui-scale",String(z));r.dataset.uiZoom=String(z);r.style.removeProperty("zoom");}catch(e){}})();`;

