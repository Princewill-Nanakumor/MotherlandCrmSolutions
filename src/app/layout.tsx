// src/app/layout.tsx
import type { Metadata } from "next";
import { headers } from "next/headers";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import Script from "next/script";
import { AblyTeardownOutsideDashboard } from "@/components/AblyTeardownOutsideDashboard";
import { AppBrandingProvider } from "@/components/AppBrandingProvider";
import {
  buildAppMetadata,
  buildStructuredData,
  getBrandingForHost,
} from "@/lib/appBranding";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      >
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
