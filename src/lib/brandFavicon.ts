/**
 * Favicon SVG built from the Motherland logo mark.
 * Uses an explicit hex fill so it can track tenant brand color
 * (browser favicons can't read page CSS variables).
 */

const DEFAULT_FAVICON_COLOR = "#2D6F8B";

export function buildBrandFaviconSvg(primaryHex: string): string {
  const fill = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(primaryHex.trim())
    ? primaryHex.trim().toUpperCase()
    : DEFAULT_FAVICON_COLOR;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none">
  <rect x="20" y="20" width="216" height="216" rx="56" fill="${fill}"/>
  <g fill="#fff">
    <rect x="96" y="42" width="6" height="30" rx="2"/>
    <rect x="93" y="70" width="12" height="3"/>
    <circle cx="112" cy="92" r="7"/>
    <path d="M105 88 L108 82 L112 86 L116 82 L119 88 Z"/>
    <path d="M106 98 L102 146 L110 146 L112 120 L114 146 L122 146 L118 98 Z"/>
    <path d="M107 102 L92 84 L88 88 L102 108 Z"/>
    <path d="M118 102 L133 94 L136 99 L120 108 Z"/>
    <rect x="100" y="146" width="28" height="8"/>
  </g>
  <g transform="translate(150 95)">
    <path fill="#fff" d="M22 0 C10 0 0 10 0 22 C0 38 22 62 22 62 S44 38 44 22 C44 10 34 0 22 0Z"/>
    <circle cx="22" cy="22" r="9" fill="${fill}"/>
  </g>
  <path d="M30 165 C55 125 105 120 170 155 C195 170 215 165 225 145 C210 185 160 188 110 170 C70 156 45 155 30 165Z" fill="#fff"/>
  <path d="M45 198 C90 182 150 182 195 198 C150 194 90 194 45 198Z" fill="#fff"/>
  <circle cx="203" cy="92" r="4" fill="#fff"/>
  <circle cx="197" cy="102" r="5" fill="#fff"/>
  <circle cx="190" cy="114" r="6" fill="#fff"/>
  <text x="147" y="72" fill="#fff" font-size="8" font-family="Arial, Helvetica, sans-serif" font-weight="700">MOTHERLAND</text>
  <text x="147" y="86" fill="#fff" font-size="15" font-family="Arial, Helvetica, sans-serif" font-weight="700">CRM</text>
  <text x="147" y="96" fill="#fff" font-size="6" font-family="Arial, Helvetica, sans-serif">SOLUTIONS</text>
</svg>`;
}

export function brandFaviconDataUri(primaryHex: string): string {
  return `data:image/svg+xml,${encodeURIComponent(buildBrandFaviconSvg(primaryHex))}`;
}

/** Update (or create) the document favicon to match the active brand primary. */
export function applyBrandFavicon(primaryHex: string): void {
  if (typeof document === "undefined") return;

  const href = brandFaviconDataUri(primaryHex);

  // Only touch our own <link> — never remove Next/React metadata icons
  // (that causes removeChild crashes during React reconciliation).
  let brandLink = document.querySelector(
    'link[data-brand-favicon="1"]',
  ) as HTMLLinkElement | null;

  if (!brandLink) {
    brandLink = document.createElement("link");
    brandLink.rel = "icon";
    brandLink.type = "image/svg+xml";
    brandLink.sizes = "any";
    brandLink.dataset.brandFavicon = "1";
    document.head.appendChild(brandLink);
  }

  if (brandLink.getAttribute("href") !== href) {
    brandLink.setAttribute("href", href);
  }

  // Prefer our branded icon by moving it last among icon links.
  document.head.appendChild(brandLink);

  const themeColor =
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(primaryHex.trim())
      ? primaryHex.trim().toUpperCase()
      : DEFAULT_FAVICON_COLOR;

  const themeMeta = document.querySelector(
    'meta[name="theme-color"]',
  ) as HTMLMetaElement | null;
  if (themeMeta) {
    themeMeta.content = themeColor;
  }
}
