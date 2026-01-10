// src/app/layout.tsx
import type { Metadata } from "next";
import { Space_Grotesk, Geist_Mono } from "next/font/google";
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
  metadataBase: new URL("https://motherland.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://motherland.com",
    title:
      "Motherland CRM Solutions - Modern CRM Solution for Excel & CSV Import",
    description:
      "Transform your Excel & CSV data into actionable leads with Motherland CRM Solutions. Streamline data processing, import files seamlessly, and manage customer relationships efficiently.",
    siteName: "Motherland CRM Solutions",
    images: [
      {
        url: "/og-image.png",
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
    "apple-mobile-web-app-title": "ZodaShield",
    "application-name": "ZodaShield",
    "msapplication-TileColor": "#6366F1",
    "theme-color": "#6366F1",
  },
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Structured Data for better SEO - using dangerouslySetInnerHTML in head */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ZodaShield",
              description:
                "Modern CRM Solution for Excel & CSV file import and lead management",
              url: "https://motherland.com",
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
            }),
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
