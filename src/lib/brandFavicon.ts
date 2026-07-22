/**
 * Favicon SVG built from the Motherland logo mark.
 * Uses an explicit hex fill so it can track tenant brand color
 * (browser favicons can't read page CSS variables).
 */

const DEFAULT_FAVICON_COLOR = "#2D6F8B";

/** Bumped when SVG markup changes so stale cached data URIs are discarded. */
export const BRAND_THEME_FAVICON_STORAGE_KEY = "motherland-brand-favicon-v2";
/** Hex only — used by the beforeInteractive boot script to rebuild if needed. */
export const BRAND_THEME_FAVICON_COLOR_KEY = "motherland-brand-favicon-color";

export function normalizeFaviconColor(primaryHex: string): string {
  const raw = String(primaryHex ?? "").trim();
  if (/^#([0-9A-Fa-f]{6})$/.test(raw)) return raw.toUpperCase();
  if (/^#([0-9A-Fa-f]{3})$/.test(raw)) {
    const r = raw[1]!;
    const g = raw[2]!;
    const b = raw[3]!;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return DEFAULT_FAVICON_COLOR;
}

export function buildBrandFaviconSvg(primaryHex: string): string {
  const fill = normalizeFaviconColor(primaryHex);

  // Full-bleed brand background (no transparent margins) so the color reads
  // clearly at 16×16 / 32×32 tab sizes. Mark artwork stays white on top.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><rect width="256" height="256" rx="56" fill="${fill}"/><g fill="#fff"><rect x="96" y="42" width="6" height="30" rx="2"/><rect x="93" y="70" width="12" height="3"/><circle cx="112" cy="92" r="7"/><path d="M105 88 L108 82 L112 86 L116 82 L119 88 Z"/><path d="M106 98 L102 146 L110 146 L112 120 L114 146 L122 146 L118 98 Z"/><path d="M107 102 L92 84 L88 88 L102 108 Z"/><path d="M118 102 L133 94 L136 99 L120 108 Z"/><rect x="100" y="146" width="28" height="8"/></g><g transform="translate(150 95)"><path fill="#fff" d="M22 0 C10 0 0 10 0 22 C0 38 22 62 22 62 S44 38 44 22 C44 10 34 0 22 0Z"/><circle cx="22" cy="22" r="9" fill="${fill}"/></g><path d="M30 165 C55 125 105 120 170 155 C195 170 215 165 225 145 C210 185 160 188 110 170 C70 156 45 155 30 165Z" fill="#fff"/><path d="M45 198 C90 182 150 182 195 198 C150 194 90 194 45 198Z" fill="#fff"/><circle cx="203" cy="92" r="4" fill="#fff"/><circle cx="197" cy="102" r="5" fill="#fff"/><circle cx="190" cy="114" r="6" fill="#fff"/><text x="147" y="72" fill="#fff" font-size="8" font-family="Arial, Helvetica, sans-serif" font-weight="700">MOTHERLAND</text><text x="147" y="86" fill="#fff" font-size="15" font-family="Arial, Helvetica, sans-serif" font-weight="700">CRM</text><text x="147" y="96" fill="#fff" font-size="6" font-family="Arial, Helvetica, sans-serif">SOLUTIONS</text></svg>`;
}

export function brandFaviconDataUri(primaryHex: string): string {
  // charset helps Safari/Firefox decode the SVG reliably.
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    buildBrandFaviconSvg(primaryHex),
  )}`;
}

function syncThemeColor(primaryHex: string) {
  const themeColor = normalizeFaviconColor(primaryHex);
  let themeMeta = document.querySelector(
    'meta[name="theme-color"]',
  ) as HTMLMetaElement | null;
  if (!themeMeta) {
    themeMeta = document.createElement("meta");
    themeMeta.name = "theme-color";
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = themeColor;
}

/**
 * Upsert a branded favicon <link>. Recreates the node when href changes so
 * Chromium actually refreshes the tab icon (setting href alone is often ignored).
 */
function upsertBrandIconLink(
  rel: "icon" | "apple-touch-icon",
  href: string,
  attrs?: { type?: string; sizes?: string },
) {
  const selector = `link[data-brand-favicon="1"][data-brand-rel="${rel}"]`;
  let link = document.querySelector(selector) as HTMLLinkElement | null;
  const sameHref = link?.getAttribute("href") === href;

  if (link && sameHref) {
    // Keep ours last so we win over Next metadata static icons.
    document.head.appendChild(link);
    return;
  }

  if (link) {
    link.remove();
  }

  link = document.createElement("link");
  link.rel = rel;
  link.dataset.brandFavicon = "1";
  link.dataset.brandRel = rel;
  if (attrs?.type) link.type = attrs.type;
  if (attrs?.sizes) link.sizes = attrs.sizes;
  link.setAttribute("href", href);
  document.head.appendChild(link);
}

/** Persist favicon data URI + hex for the beforeInteractive boot script. */
export function persistBrandFaviconCache(primaryHex: string): void {
  if (typeof window === "undefined") return;
  const color = normalizeFaviconColor(primaryHex);
  try {
    window.localStorage.setItem(
      BRAND_THEME_FAVICON_STORAGE_KEY,
      brandFaviconDataUri(color),
    );
    window.localStorage.setItem(BRAND_THEME_FAVICON_COLOR_KEY, color);
    // Drop legacy cache from before full-bleed / charset fixes.
    window.localStorage.removeItem("motherland-brand-favicon");
  } catch {
    // ignore quota / private-mode failures
  }
}

/**
 * Update (or create) the document favicon to match the active brand primary.
 * Only manages our own <link data-brand-favicon> nodes — never mutates
 * Next/React metadata icons (that can crash reconciliation).
 */
export function applyBrandFavicon(primaryHex: string): void {
  if (typeof document === "undefined") return;

  const color = normalizeFaviconColor(primaryHex);
  const href = brandFaviconDataUri(color);

  upsertBrandIconLink("icon", href, {
    type: "image/svg+xml",
    sizes: "any",
  });
  upsertBrandIconLink("apple-touch-icon", href, {
    sizes: "180x180",
  });

  // Remove obsolete "shortcut icon" branded links from earlier revisions.
  document
    .querySelectorAll('link[data-brand-favicon="1"][rel="shortcut icon"]')
    .forEach((node) => node.remove());

  syncThemeColor(color);
  persistBrandFaviconCache(color);

  // Next metadata may inject static icons after us — keep branded links last.
  requestAnimationFrame(() => {
    document
      .querySelectorAll("link[data-brand-favicon='1']")
      .forEach((node) => document.head.appendChild(node));
  });
}
