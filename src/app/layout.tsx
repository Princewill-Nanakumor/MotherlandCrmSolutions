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
    default: "Motherland CRM Solutions - Modern CRM Solution for Excel & CSV Import",
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
    title: "Motherland CRM Solutions - Modern CRM Solution for Excel & CSV Import",
    description:
      "Transform your Excel & CSV data into actionable leads with Motherland CRM Solutions. Streamline data processing, import files seamlessly, and manage customer relationships efficiently.",
    siteName: "Motherland CRM Solutions",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "ZodaShield - Modern CRM Solution",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Additional meta tags for better SEO */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#6366F1" />
        <meta name="msapplication-TileColor" content="#6366F1" />

        {/* Preconnect to external domains for performance */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />

        {/* Favicon */}
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href="/apple-touch-icon.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href="/favicon-32x32.png"
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href="/favicon-16x16.png"
        />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Structured Data for better SEO */}
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
