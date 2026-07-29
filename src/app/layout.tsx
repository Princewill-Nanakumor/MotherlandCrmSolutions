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
import { BRAND_THEME_BOOT_SCRIPT } from "@/lib/brandFavicon";
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
            // cached hex when the data-URI cache is missing/stale; competing
            // Next metadata icons are retargeted so the default SVG cannot win.
            __html: BRAND_THEME_BOOT_SCRIPT,
          }}
        />
        {/* Inline JSON-LD so search/AI crawlers see schema in the initial HTML. */}
        <script
          id="structured-data"
          type="application/ld+json"
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
