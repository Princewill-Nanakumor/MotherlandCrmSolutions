import type { Metadata } from "next";

export type AppBranding = {
  host: string;
  origin: string;
  displayName: string;
  shortName: string;
  supportEmail: string;
  logoLetter: string;
  telegramHandle?: string;
  telegramUrl?: string;
};

type BrandPreset = Omit<AppBranding, "host" | "origin">;

const SHARED_SUPPORT_TELEGRAM = {
  telegramHandle: "@solutioncrm4847",
  telegramUrl: "https://t.me/solutioncrm4847",
} as const;

const HOST_PRESETS: Record<string, BrandPreset> = {
  "motherlandcrmsolutions.com": {
    displayName: "Motherland CRM",
    shortName: "Motherland CRM",
    supportEmail: "support@motherlandcrmsolutions.com",
    logoLetter: "M",
    ...SHARED_SUPPORT_TELEGRAM,
  },
  "vertexcrmsolution.com": {
    displayName: "Vertex CRM Solution",
    shortName: "Vertex CRM",
    supportEmail: "support@vertexcrmsolution.com",
    logoLetter: "V",
    ...SHARED_SUPPORT_TELEGRAM,
  },
};

const DEFAULT_PRESET = HOST_PRESETS["motherlandcrmsolutions.com"];

/** Normalize Host / X-Forwarded-Host (strip port, lowercase, drop trailing dot). */
export function normalizeAppHost(host: string | null | undefined): string {
  if (!host) return "";
  return host.split(",")[0]?.trim().split(":")[0]?.toLowerCase().replace(/\.$/, "") ?? "";
}

function presetForHost(host: string): BrandPreset {
  const normalized = normalizeAppHost(host);
  if (!normalized) return DEFAULT_PRESET;

  if (HOST_PRESETS[normalized]) {
    return HOST_PRESETS[normalized];
  }

  if (normalized.startsWith("www.")) {
    const bare = normalized.slice(4);
    if (HOST_PRESETS[bare]) return HOST_PRESETS[bare];
  }

  const envName = process.env.NEXT_PUBLIC_APP_NAME?.trim();
  if (envName) {
    return {
      displayName: envName,
      shortName: envName,
      supportEmail:
        process.env.RESEND_REPLY_TO?.trim() ||
        DEFAULT_PRESET.supportEmail,
      logoLetter: envName.charAt(0).toUpperCase() || "C",
    };
  }

  return DEFAULT_PRESET;
}

export function getBrandingForHost(host: string | null | undefined): AppBranding {
  const normalized = normalizeAppHost(host) || "motherlandcrmsolutions.com";
  const preset = presetForHost(normalized);
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";

  return {
    host: normalized,
    origin: `${protocol}://${normalized}`,
    ...preset,
  };
}

/** Origins allowed for NextAuth redirects and absolute links. */
export function getTrustedAppOrigins(): string[] {
  const fromEnv = (process.env.ALLOWED_APP_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean);

  const builtIn = Object.keys(HOST_PRESETS).flatMap((host) => [
    `https://${host}`,
    `https://www.${host}`,
  ]);

  return [...new Set([...builtIn, ...fromEnv])];
}

export function isTrustedAppOrigin(origin: string): boolean {
  try {
    const normalized = new URL(origin).origin;
    return getTrustedAppOrigins().includes(normalized);
  } catch {
    return false;
  }
}

/** Prefer the incoming request host in production; fall back to env / default. */
export function getPublicAppOriginFromHost(
  host: string | null | undefined,
): string {
  const normalized = normalizeAppHost(host);
  if (normalized && !isNetlifyPreviewHost(normalized)) {
    const protocol =
      process.env.NODE_ENV === "production" ? "https" : "http";
    return `${protocol}://${normalized}`;
  }

  const raw =
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.CANONICAL_APP_URL?.trim() ||
    "http://localhost:3000";
  return raw.replace(/\/$/, "");
}

export function isNetlifyPreviewHost(host: string): boolean {
  const normalized = normalizeAppHost(host);
  return normalized.endsWith(".netlify.app");
}

export function isPrimaryProductionHost(host: string): boolean {
  const normalized = normalizeAppHost(host);
  return (
    normalized in HOST_PRESETS ||
    normalized.replace(/^www\./, "") in HOST_PRESETS
  );
}

/** Search / AI discovery phrases for Motherland + white-label hosts. */
export function buildBrandKeywords(branding: AppBranding): string[] {
  const base = [
    branding.displayName,
    branding.shortName,
    "Motherland CRM",
    "Motherlands CRM",
    "Motherland CRM Solutions",
    "Motherlands CRM Solutions",
    "CRM",
    "CRM software",
    "CRM solution",
    "CRM platform",
    "lead management CRM",
    "sales CRM",
    "Excel CRM import",
    "CSV lead import",
    "real-time CRM",
    "multi-tenant CRM",
    "crypto billing CRM",
  ];

  return [...new Set(base.filter(Boolean))];
}

export function buildAppMetadata(branding: AppBranding): Metadata {
  const description = `${branding.displayName} (also known as ${branding.shortName} / Motherlands CRM) is a modern CRM platform for sales teams. Import Excel & CSV leads, assign agents, track pipelines in real time, and close more deals with Motherland CRM Solutions.`;
  const keywords = buildBrandKeywords(branding);
  const titleDefault = `${branding.displayName} | Motherland CRM – Modern CRM Solutions`;

  return {
    title: {
      default: titleDefault,
      template: `%s | ${branding.displayName}`,
    },
    description,
    keywords,
    authors: [{ name: `${branding.displayName} Team` }],
    creator: branding.displayName,
    publisher: branding.displayName,
    applicationName: branding.shortName,
    formatDetection: {
      email: false,
      address: false,
      telephone: false,
    },
    metadataBase: new URL(branding.origin),
    alternates: {
      canonical: "/",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      url: branding.origin,
      title: titleDefault,
      description,
      siteName: branding.displayName,
      images: [
        {
          url: "/Motherlandfav.png",
          width: 1200,
          height: 630,
          alt: `${branding.shortName} – Motherland CRM Solutions`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: titleDefault,
      description,
      images: ["/Motherlandfav.png"],
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
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": branding.shortName,
      "application-name": branding.shortName,
      "msapplication-TileColor": "#2D6F8B",
      "theme-color": "#2D6F8B",
    },
    manifest: undefined,
    icons: {
      icon: [
        {
          url: "/motherland-favicon.svg",
          type: "image/svg+xml",
          sizes: "any",
        },
      ],
      apple: [
        {
          url: "/motherland-favicon.svg",
          type: "image/svg+xml",
          sizes: "180x180",
        },
      ],
      shortcut: [
        {
          url: "/motherland-favicon.svg",
          type: "image/svg+xml",
        },
      ],
    },
  };
}

export function buildStructuredData(branding: AppBranding) {
  const keywords = buildBrandKeywords(branding);
  const description = `${branding.displayName} is a CRM software platform for lead management, Excel & CSV import, team assignment, and real-time sales pipelines. Also known as Motherland CRM and Motherlands CRM Solutions.`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${branding.origin}/#organization`,
        name: branding.displayName,
        alternateName: [
          branding.shortName,
          "Motherland CRM",
          "Motherlands CRM",
          "Motherland CRM Solutions",
          "Motherlands CRM Solutions",
        ],
        url: branding.origin,
        email: branding.supportEmail,
        logo: `${branding.origin}/Motherlandfav.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${branding.origin}/#website`,
        name: branding.displayName,
        alternateName: ["Motherland CRM", "Motherlands CRM Solutions", "CRM"],
        url: branding.origin,
        description,
        publisher: { "@id": `${branding.origin}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${branding.origin}/#app`,
        name: branding.shortName,
        alternateName: [
          branding.displayName,
          "Motherland CRM",
          "Motherlands CRM",
          "Motherland CRM Solutions",
          "Motherlands CRM Solutions",
        ],
        description,
        url: branding.origin,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "CRM Software",
        operatingSystem: "Web Browser",
        keywords: keywords.join(", "),
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          description: "3-day free trial — no credit card required",
        },
        author: { "@id": `${branding.origin}/#organization` },
        provider: { "@id": `${branding.origin}/#organization` },
      },
    ],
  };
}

export function getServerAppBranding(): AppBranding {
  const configured =
    process.env.CANONICAL_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    try {
      const hostname = new URL(configured).hostname;
      const isLocal =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "::1";
      // Ignore localhost URLs mistakenly set in production env
      if (!(process.env.NODE_ENV === "production" && isLocal)) {
        return getBrandingForHost(hostname);
      }
    } catch {
      // fall through
    }
  }

  return getBrandingForHost(null);
}

export function dashboardPageTitle(shortName: string, page: string): string {
  return `${shortName} - ${page}`;
}
