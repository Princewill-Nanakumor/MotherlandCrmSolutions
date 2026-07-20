// src/app/layout.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AblyTeardownOutsideDashboard } from "@/components/AblyTeardownOutsideDashboard";
import { AppBrandingProvider } from "@/components/AppBrandingProvider";
import {
  buildAppMetadata,
  buildStructuredData,
  getBrandingForHost,
} from "@/lib/appBranding";
import { brandFontVariablesClassName } from "@/lib/brandFontLoaders";
import "./globals.css";

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

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
      className={`${brandFontVariablesClassName} ${geistMono.variable}`}
    >
      <body className="antialiased">
        <Script
          id="tenant-brand-theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            // Fonts are self-hosted via next/font CSS variables on <html> —
            // only restore colors / button style from cache.
            __html: `(function(){try{var t=localStorage.getItem("motherland-brand-theme");if(t){var th=JSON.parse(t);if(th&&th.buttonStyle)document.documentElement.dataset.brandButtonStyle=th.buttonStyle;}var c=localStorage.getItem("motherland-brand-theme-css");if(!c)return;var v=JSON.parse(c),r=document.documentElement,k;for(k in v){if(Object.prototype.hasOwnProperty.call(v,k))r.style.setProperty(k,v[k]);}}catch(e){}})();`,
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
        <AppBrandingProvider branding={branding}>
          <AblyTeardownOutsideDashboard />
          {children}
        </AppBrandingProvider>
      </body>
    </html>
  );
}
