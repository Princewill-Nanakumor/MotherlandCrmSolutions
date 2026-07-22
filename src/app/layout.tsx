// src/app/layout.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { GeistMono } from "geist/font/mono";
import Script from "next/script";
import { AblyTeardownOutsideDashboard } from "@/components/AblyTeardownOutsideDashboard";
import { AppBrandingProvider } from "@/components/AppBrandingProvider";
import {
  buildAppMetadata,
  buildStructuredData,
  getBrandingForHost,
} from "@/lib/appBranding";
import { brandFontVariablesClassName } from "@/lib/brandFontLoaders";
import { UiZoomApplier } from "@/components/UiZoomApplier";
import { UI_ZOOM_BOOT_SCRIPT } from "@/lib/uiZoom";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  return buildAppMetadata(getBrandingForHost(host));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const branding = getBrandingForHost(host);
  const structuredData = buildStructuredData(branding);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={`${brandFontVariablesClassName} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <Script
          id="ui-zoom-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            // Viewport-aware density: denser on laptop windows, eases to 1.0 on large screens.
            __html: UI_ZOOM_BOOT_SCRIPT,
          }}
        />
        <Script
          id="tenant-brand-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            // Restore brand CSS + favicon before paint. Favicon is rebuilt from
            // cached hex when the data-URI cache is missing/stale.
            __html: `(function(){try{var COLOR_KEY="motherland-brand-favicon-color",FAV_KEY="motherland-brand-favicon-v2",DEFAULT="#2D6F8B";function norm(c){c=String(c||"").trim();if(/^#([0-9A-Fa-f]{6})$/.test(c))return c.toUpperCase();if(/^#([0-9A-Fa-f]{3})$/.test(c)){var r=c[1],g=c[2],b=c[3];return("#"+r+r+g+g+b+b).toUpperCase();}return DEFAULT;}function svgUri(c){c=norm(c);var s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="none"><rect width="256" height="256" rx="56" fill="'+c+'"/><g fill="#fff"><rect x="96" y="42" width="6" height="30" rx="2"/><rect x="93" y="70" width="12" height="3"/><circle cx="112" cy="92" r="7"/><path d="M105 88 L108 82 L112 86 L116 82 L119 88 Z"/><path d="M106 98 L102 146 L110 146 L112 120 L114 146 L122 146 L118 98 Z"/><path d="M107 102 L92 84 L88 88 L102 108 Z"/><path d="M118 102 L133 94 L136 99 L120 108 Z"/><rect x="100" y="146" width="28" height="8"/></g><g transform="translate(150 95)"><path fill="#fff" d="M22 0 C10 0 0 10 0 22 C0 38 22 62 22 62 S44 38 44 22 C44 10 34 0 22 0Z"/><circle cx="22" cy="22" r="9" fill="'+c+'"/></g><path d="M30 165 C55 125 105 120 170 155 C195 170 215 165 225 145 C210 185 160 188 110 170 C70 156 45 155 30 165Z" fill="#fff"/><path d="M45 198 C90 182 150 182 195 198 C150 194 90 194 45 198Z" fill="#fff"/><circle cx="203" cy="92" r="4" fill="#fff"/><circle cx="197" cy="102" r="5" fill="#fff"/><circle cx="190" cy="114" r="6" fill="#fff"/><text x="147" y="72" fill="#fff" font-size="8" font-family="Arial, Helvetica, sans-serif" font-weight="700">MOTHERLAND</text><text x="147" y="86" fill="#fff" font-size="15" font-family="Arial, Helvetica, sans-serif" font-weight="700">CRM</text><text x="147" y="96" fill="#fff" font-size="6" font-family="Arial, Helvetica, sans-serif">SOLUTIONS</text></svg>';return"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(s);}function ensureLink(rel,href,sizes){var sel='link[data-brand-favicon="1"][data-brand-rel="'+rel+'"]';var el=document.querySelector(sel);if(!el){el=document.createElement("link");el.rel=rel;el.setAttribute("data-brand-favicon","1");el.setAttribute("data-brand-rel",rel);if(rel==="icon"){el.type="image/svg+xml";el.sizes=sizes||"any";}else if(sizes){el.sizes=sizes;}document.head.appendChild(el);}el.href=href;}var t=localStorage.getItem("motherland-brand-theme");var th=null;if(t){th=JSON.parse(t);if(th&&th.buttonStyle)document.documentElement.dataset.brandButtonStyle=th.buttonStyle;}var c=localStorage.getItem("motherland-brand-theme-css");if(c){var v=JSON.parse(c),r=document.documentElement,k;for(k in v){if(Object.prototype.hasOwnProperty.call(v,k))r.style.setProperty(k,v[k]);}}var color=localStorage.getItem(COLOR_KEY);if(!color&&th){color=th.buttonStyle==="solid"?(th.solidPrimary||th.primary):th.primary;}color=norm(color||DEFAULT);var f=localStorage.getItem(FAV_KEY);if(!f||f.indexOf(encodeURIComponent(color))===-1){f=svgUri(color);try{localStorage.setItem(FAV_KEY,f);localStorage.setItem(COLOR_KEY,color);localStorage.removeItem("motherland-brand-favicon");}catch(e){}}ensureLink("icon",f,"any");ensureLink("apple-touch-icon",f,"180x180");}catch(e){}})();`,
          }}
        />
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        <div id="app-density-root" className="app-density-root">
          <AppBrandingProvider branding={branding}>
            <UiZoomApplier />
            <AblyTeardownOutsideDashboard />
            {children}
          </AppBrandingProvider>
        </div>
      </body>
    </html>
  );
}
