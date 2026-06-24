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
    displayName: "Motherland CRM Solutions",
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

export function buildAppMetadata(branding: AppBranding): Metadata {
  const tagline = "Modern CRM Solution for Excel & CSV Import";
  const description = `Transform your Excel & CSV data into actionable leads with ${branding.displayName}. Streamline data processing, import files seamlessly, and manage customer relationships efficiently.`;

  return {
    title: {
      default: `${branding.displayName} - ${tagline}`,
      template: `%s | ${branding.displayName}`,
    },
    description,
    authors: [{ name: `${branding.displayName} Team` }],
    creator: branding.displayName,
    publisher: branding.displayName,
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
      title: `${branding.displayName} - ${tagline}`,
      description,
      siteName: branding.displayName,
      images: [
        {
          url: "/Motherlandfav.png",
          width: 1200,
          height: 630,
          alt: `${branding.shortName} - Modern CRM Solution`,
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
      "mobile-web-app-capable": "yes",
      "apple-mobile-web-app-status-bar-style": "default",
      "apple-mobile-web-app-title": branding.shortName,
      "application-name": branding.shortName,
      "msapplication-TileColor": "#6366F1",
      "theme-color": "#6366F1",
    },
    manifest: undefined,
    icons: {
      icon: [{ url: "/Motherlandfav.png?v=2", sizes: "any", type: "image/png" }],
      apple: [
        { url: "/Motherlandfav.png?v=2", sizes: "180x180", type: "image/png" },
      ],
      shortcut: [{ url: "/Motherlandfav.png?v=2", type: "image/png" }],
    },
  };
}

export function buildStructuredData(branding: AppBranding) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: branding.shortName,
    description:
      "Modern CRM Solution for Excel & CSV file import and lead management",
    url: branding.origin,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    author: {
      "@type": "Organization",
      name: branding.displayName,
    },
  };
}

export function getServerAppBranding(): AppBranding {
  const configured =
    process.env.CANONICAL_APP_URL?.trim() ||
    process.env.TABOOLA_WEBHOOK_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    try {
      return getBrandingForHost(new URL(configured).hostname);
    } catch {
      // fall through
    }
  }

  return getBrandingForHost(null);
}

export function dashboardPageTitle(shortName: string, page: string): string {
  return `${shortName} - ${page}`;
}
