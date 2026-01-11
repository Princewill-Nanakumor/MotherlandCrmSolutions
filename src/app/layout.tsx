// src/app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
// Temporarily removed ClientProviders due to persistent webpack issues

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

export const metadata: Metadata = {
  title: {
    default:
      "Motherland CRM Solutions - Modern CRM Solution for Excel & CSV Import",
    template: "%s | Motherland CRM Solutions",
  },
  description:
    "Transform your Excel & CSV data into actionable leads with Motherland CRM Solutions. Streamline data processing, import files seamlessly, and manage customer relationships efficiently.",
  keywords: [
    "CRM",
    "Customer Relationship Management",
    "Excel import",
    "CSV import",
    "Lead management",
    "Data processing",
    "Business software",
    "Sales management",
    "Contact management",
    "Import tools",
  ],
  authors: [{ name: "Motherland CRM Solutions Team" }],
  creator: "Motherland CRM Solutions",
  publisher: "Motherland CRM Solutions",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://motherlandcrmsolutions.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://motherlandcrmsolutions.com",
    title:
      "Motherland CRM Solutions - Modern CRM Solution for Excel & CSV Import",
    description:
      "Transform your Excel & CSV data into actionable leads with Motherland CRM Solutions. Streamline data processing, import files seamlessly, and manage customer relationships efficiently.",
    siteName: "Motherland CRM Solutions",
    images: [
      {
        url: "/Motherlandfav.png",
        width: 1200,
        height: 630,
        alt: "Motherland - Modern CRM Solution",
      },
    ],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  category: "Business Software",
  classification: "CRM Software",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "Motherland CRM",
    "application-name": "Motherland CRM",
    "msapplication-TileColor": "#6366F1",
    "theme-color": "#6366F1",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/Motherlandfav.png?v=2", sizes: "any", type: "image/png" },
    ],
    apple: [
      { url: "/Motherlandfav.png?v=2", sizes: "180x180", type: "image/png" },
    ],
    shortcut: [
      { url: "/Motherlandfav.png?v=2", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Motherland CRM",
    description:
      "Modern CRM Solution for Excel & CSV file import and lead management",
    url: "https://motherlandcrmsolutions.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: "Motherland CRM Solutions",
    },
  };

  return (
    <html lang="en" suppressHydrationWarning data-scroll-behavior="smooth">
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        {/* Structured Data for better SEO - using afterInteractive for App Router compatibility */}
        <Script
          id="structured-data"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData),
          }}
        />
        {children}
      </body>
    </html>
  );
}
