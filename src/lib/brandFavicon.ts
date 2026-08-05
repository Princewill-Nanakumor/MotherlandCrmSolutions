/**
 * Favicon SVG built from the Motherland logo mark.
 * Uses an explicit hex fill so it can track tenant brand color
 * (browser favicons can't read page CSS variables).
 *
 * Race note: Next metadata injects `/motherland-favicon.svg` (default teal).
 * Without demoting those links and recreating branded <link> nodes, Chromium
 * often keeps the static icon until a hard refresh.
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
 * Point every competing Next/metadata icon at the brand data URI so the
 * browser cannot keep showing `/motherland-favicon.svg` after a theme change.
 */
function retargetCompetingIconLinks(href: string) {
  document
    .querySelectorAll(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
    )
    .forEach((node) => {
      const el = node as HTMLLinkElement;
      if (el.dataset.brandFavicon === "1") return;
      if (el.getAttribute("href") !== href) {
        el.setAttribute("href", href);
      }
      // type helps browsers treat retargeted static icons as SVG.
      if (!el.type || el.type.includes("svg") || el.href.startsWith("data:")) {
        el.type = "image/svg+xml";
      }
      el.dataset.brandFaviconRetargeted = "1";
    });
}

/**
 * Upsert a branded favicon <link>. Recreates the node when href changes so
 * Chromium actually refreshes the tab icon (setting href alone is often ignored).
 * Pass `force` to recreate even when href is unchanged — needed when switching
 * browser tabs after Next re-injected `/motherland-favicon.svg`.
 */
function upsertBrandIconLink(
  rel: "icon" | "apple-touch-icon",
  href: string,
  attrs?: { type?: string; sizes?: string },
  force = false,
) {
  const selector = `link[data-brand-favicon="1"][data-brand-rel="${rel}"]`;
  let link = document.querySelector(selector) as HTMLLinkElement | null;
  const sameHref = link?.getAttribute("href") === href;

  if (link && sameHref && !force) {
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

export function readPersistedFaviconColor(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const color = window.localStorage.getItem(BRAND_THEME_FAVICON_COLOR_KEY);
    return color ? normalizeFaviconColor(color) : null;
  } catch {
    return null;
  }
}

let faviconObserver: MutationObserver | null = null;
let lastAppliedFaviconHref: string | null = null;
let watchedFaviconHref: string | null = null;

function isIconLinkRel(rel: string | null): boolean {
  if (!rel) return false;
  const normalized = rel.toLowerCase();
  return (
    normalized === "icon" ||
    normalized === "shortcut icon" ||
    normalized.includes("icon")
  );
}

function retargetIconLinkNode(node: Element, href: string): void {
  if (!(node instanceof HTMLLinkElement)) return;
  if (node.dataset.brandFavicon === "1") return;
  if (!isIconLinkRel(node.getAttribute("rel"))) return;
  if (node.getAttribute("href") !== href) {
    node.setAttribute("href", href);
  }
  node.type = "image/svg+xml";
  node.dataset.brandFaviconRetargeted = "1";
}

/**
 * Watch for Next/metadata injecting new icon links for the life of the page.
 * Only retarget newly added non-branded nodes — never move branded links here
 * (appendChild would re-fire this observer and loop forever).
 */
function ensureFaviconHeadWatch(href: string) {
  if (typeof MutationObserver === "undefined" || typeof document === "undefined") {
    return;
  }

  watchedFaviconHref = href;

  if (faviconObserver) {
    return;
  }

  faviconObserver = new MutationObserver((mutations) => {
    const currentHref = watchedFaviconHref;
    if (!currentHref) return;
    for (const mutation of mutations) {
      mutation.addedNodes.forEach((added) => {
        if (!(added instanceof Element)) return;
        if (added instanceof HTMLLinkElement) {
          retargetIconLinkNode(added, currentHref);
          return;
        }
        added
          .querySelectorAll?.(
            'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"]',
          )
          .forEach((link) => retargetIconLinkNode(link, currentHref));
      });
    }
  });
  faviconObserver.observe(document.head, { childList: true, subtree: true });
}

/**
 * Update (or create) the document favicon to match the active brand primary.
 * Only manages our own <link data-brand-favicon> nodes — never mutates
 * Next/React metadata icon *elements* in a way that crashes reconciliation;
 * we only retarget their href to the brand data URI.
 */
export function applyBrandFavicon(
  primaryHex: string,
  options?: { force?: boolean },
): void {
  if (typeof document === "undefined") return;

  const color = normalizeFaviconColor(primaryHex);
  const href = brandFaviconDataUri(color);
  const force = Boolean(options?.force);
  lastAppliedFaviconHref = href;

  retargetCompetingIconLinks(href);

  upsertBrandIconLink(
    "icon",
    href,
    {
      type: "image/svg+xml",
      sizes: "any",
    },
    force,
  );
  upsertBrandIconLink(
    "apple-touch-icon",
    href,
    {
      sizes: "180x180",
    },
    force,
  );

  // Remove obsolete "shortcut icon" branded links from earlier revisions.
  document
    .querySelectorAll('link[data-brand-favicon="1"][rel="shortcut icon"]')
    .forEach((node) => node.remove());

  syncThemeColor(color);
  persistBrandFaviconCache(color);

  // One-time order fix (outside the observer — safe).
  requestAnimationFrame(() => {
    retargetCompetingIconLinks(href);
    document
      .querySelectorAll("link[data-brand-favicon='1']")
      .forEach((node) => document.head.appendChild(node));
  });

  ensureFaviconHeadWatch(href);
}

/**
 * Re-apply the persisted brand favicon, forcing Chromium to refresh the tab
 * icon after backgrounding / bfcache / metadata reinjection.
 */
export function refreshBrandFaviconFromCache(): void {
  if (typeof document === "undefined") return;
  const color = readPersistedFaviconColor();
  if (color) {
    applyBrandFavicon(color, { force: true });
    return;
  }
  if (lastAppliedFaviconHref) {
    retargetCompetingIconLinks(lastAppliedFaviconHref);
    upsertBrandIconLink(
      "icon",
      lastAppliedFaviconHref,
      { type: "image/svg+xml", sizes: "any" },
      true,
    );
    upsertBrandIconLink(
      "apple-touch-icon",
      lastAppliedFaviconHref,
      { sizes: "180x180" },
      true,
    );
    ensureFaviconHeadWatch(lastAppliedFaviconHref);
    return;
  }
  reassertBrandFavicon();
}

/** Re-assert the last applied favicon (e.g. after client route changes). */
export function reassertBrandFavicon(): void {
  if (!lastAppliedFaviconHref || typeof document === "undefined") {
    // Module state lost (or never applied) — restore from localStorage.
    const color = readPersistedFaviconColor();
    if (color) {
      applyBrandFavicon(color, { force: true });
    }
    return;
  }
  retargetCompetingIconLinks(lastAppliedFaviconHref);
  document
    .querySelectorAll("link[data-brand-favicon='1']")
    .forEach((node) => document.head.appendChild(node));
  ensureFaviconHeadWatch(lastAppliedFaviconHref);
}
/**
 * Inline boot logic (no imports) — keep in sync with applyBrandFavicon.
 * Restores theme CSS vars + branded favicon before first paint.
 */
export const BRAND_THEME_BOOT_SCRIPT = `(function(){try{var COLOR_KEY="motherland-brand-favicon-color",FAV_KEY="motherland-brand-favicon-v2",DEFAULT="#2D6F8B";function norm(c){c=String(c||"").trim();if(/^#([0-9A-Fa-f]{6})$/.test(c))return c.toUpperCase();if(/^#([0-9A-Fa-f]{3})$/.test(c)){var r=c[1],g=c[2],b=c[3];return("#"+r+r+g+g+b+b).toUpperCase();}return DEFAULT;}function svgUri(c){c=norm(c);var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><rect width="256" height="256" rx="56" fill="'+c+'"/><g fill="#fff"><rect x="96" y="42" width="6" height="30" rx="2"/><rect x="93" y="70" width="12" height="3"/><circle cx="112" cy="92" r="7"/><path d="M105 88 L108 82 L112 86 L116 82 L119 88 Z"/><path d="M106 98 L102 146 L110 146 L112 120 L114 146 L122 146 L118 98 Z"/><path d="M107 102 L92 84 L88 88 L102 108 Z"/><path d="M118 102 L133 94 L136 99 L120 108 Z"/><rect x="100" y="146" width="28" height="8"/></g><g transform="translate(150 95)"><path fill="#fff" d="M22 0 C10 0 0 10 0 22 C0 38 22 62 22 62 S44 38 44 22 C44 10 34 0 22 0Z"/><circle cx="22" cy="22" r="9" fill="'+c+'"/></g><path d="M30 165 C55 125 105 120 170 155 C195 170 215 165 225 145 C210 185 160 188 110 170 C70 156 45 155 30 165Z" fill="#fff"/><path d="M45 198 C90 182 150 182 195 198 C150 194 90 194 45 198Z" fill="#fff"/><circle cx="203" cy="92" r="4" fill="#fff"/><circle cx="197" cy="102" r="5" fill="#fff"/><circle cx="190" cy="114" r="6" fill="#fff"/><text x="147" y="72" fill="#fff" font-size="8" font-family="Arial, Helvetica, sans-serif" font-weight="700">MOTHERLAND</text><text x="147" y="86" fill="#fff" font-size="15" font-family="Arial, Helvetica, sans-serif" font-weight="700">CRM</text><text x="147" y="96" fill="#fff" font-size="6" font-family="Arial, Helvetica, sans-serif">SOLUTIONS</text></svg>';return"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(s);}function ensureLink(rel,href,sizes){var sel='link[data-brand-favicon="1"][data-brand-rel="'+rel+'"]';var el=document.querySelector(sel);if(el&&el.getAttribute("href")===href){document.head.appendChild(el);return;}if(el)el.remove();el=document.createElement("link");el.rel=rel;el.setAttribute("data-brand-favicon","1");el.setAttribute("data-brand-rel",rel);if(rel==="icon"){el.type="image/svg+xml";el.sizes=sizes||"any";}else if(sizes){el.sizes=sizes;}el.setAttribute("href",href);document.head.appendChild(el);}function retarget(href){document.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(function(node){if(node.getAttribute("data-brand-favicon")==="1")return;if(node.getAttribute("href")!==href)node.setAttribute("href",href);node.setAttribute("type","image/svg+xml");node.setAttribute("data-brand-favicon-retargeted","1");});}function retargetNode(node,href){if(!node||node.nodeType!==1)return;if(node.tagName==="LINK"){if(node.getAttribute("data-brand-favicon")==="1")return;var rel=(node.getAttribute("rel")||"").toLowerCase();if(rel!=="icon"&&rel!=="shortcut icon"&&rel.indexOf("icon")===-1)return;if(node.getAttribute("href")!==href)node.setAttribute("href",href);node.setAttribute("type","image/svg+xml");node.setAttribute("data-brand-favicon-retargeted","1");return;}if(node.querySelectorAll){node.querySelectorAll('link[rel="icon"],link[rel="shortcut icon"],link[rel="apple-touch-icon"]').forEach(function(link){retargetNode(link,href);});}}var t=localStorage.getItem("motherland-brand-theme");var th=null;if(t){th=JSON.parse(t);if(th&&th.buttonStyle)document.documentElement.dataset.brandButtonStyle=th.buttonStyle;}var c=localStorage.getItem("motherland-brand-theme-css");if(c){var v=JSON.parse(c),r=document.documentElement,k;for(k in v){if(Object.prototype.hasOwnProperty.call(v,k))r.style.setProperty(k,v[k]);}}var color=localStorage.getItem(COLOR_KEY);if(!color&&th){color=th.buttonStyle==="solid"?(th.solidPrimary||th.primary):th.primary;}color=norm(color||DEFAULT);var f=localStorage.getItem(FAV_KEY);if(!f||f.indexOf(encodeURIComponent(color))===-1){f=svgUri(color);try{localStorage.setItem(FAV_KEY,f);localStorage.setItem(COLOR_KEY,color);localStorage.removeItem("motherland-brand-favicon");}catch(e){}}retarget(f);ensureLink("icon",f,"any");ensureLink("apple-touch-icon",f,"180x180");if(typeof MutationObserver!=="undefined"&&document.head){var obs=new MutationObserver(function(mutations){for(var i=0;i<mutations.length;i++){var added=mutations[i].addedNodes;for(var j=0;j<added.length;j++){retargetNode(added[j],f);}}});obs.observe(document.head,{childList:true,subtree:true});setTimeout(function(){try{obs.disconnect();}catch(e){}},4000);}}catch(e){}})();`;
