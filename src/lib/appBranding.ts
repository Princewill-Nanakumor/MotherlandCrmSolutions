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

export function isLocalAppHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host === "0.0.0.0"
  );
}

/**
 * Canonical white-label host for branding / signup / Resend.
 * Production hosts win; on localhost (or unknown) use
 * `NEXT_PUBLIC_APP_BRAND` / `APP_BRAND` = `vertex` | `motherland`.
 */
export function resolveBrandHost(
  host?: string | null,
): "motherlandcrmsolutions.com" | "vertexcrmsolution.com" {
  const bare = normalizeAppHost(host).replace(/^www\./, "");
  if (bare === "vertexcrmsolution.com") return "vertexcrmsolution.com";
  if (bare === "motherlandcrmsolutions.com") {
    return "motherlandcrmsolutions.com";
  }

  const override = (
    process.env.NEXT_PUBLIC_APP_BRAND ||
    process.env.APP_BRAND ||
    ""
  )
    .trim()
    .toLowerCase();
  if (override === "vertex") return "vertexcrmsolution.com";
  if (override === "motherland") return "motherlandcrmsolutions.com";

  return "motherlandcrmsolutions.com";
}

export function getBrandingForHost(host: string | null | undefined): AppBranding {
  const normalized = normalizeAppHost(host);
  const brandHost = resolveBrandHost(host);
  const preset = HOST_PRESETS[brandHost] ?? DEFAULT_PRESET;
  const protocol =
    process.env.NODE_ENV === "production" ? "https" : "http";

  // Keep localhost as the request host so local origins stay correct;
  // brandHost drives display name / support email / signup stamp.
  const effectiveHost =
    normalized && !isLocalAppHostname(normalized) ? brandHost : normalized || brandHost;

  return {
    host: effectiveHost,
    origin: `${protocol}://${effectiveHost}`,
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

function isVertexBrand(branding: AppBranding): boolean {
  const bare = normalizeAppHost(branding.host).replace(/^www\./, "");
  return (
    bare === "vertexcrmsolution.com" ||
    branding.shortName.toLowerCase().includes("vertex") ||
    branding.displayName.toLowerCase().includes("vertex")
  );
}

/** Search / AI discovery phrases — brand-specific (no cross-brand names). */
export function buildBrandKeywords(branding: AppBranding): string[] {
  const shared = [
    branding.displayName,
    branding.shortName,
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

  const brandExtra = isVertexBrand(branding)
    ? ["Vertex CRM", "Vertex CRM Solution", "vertexcrmsolution"]
    : [
        "Motherland CRM",
        "Motherlands CRM",
        "Motherland CRM Solutions",
        "Motherlands CRM Solutions",
      ];

  return [...new Set([...shared, ...brandExtra].filter(Boolean))];
}

export function buildMetaDescription(branding: AppBranding): string {
  if (isVertexBrand(branding)) {
    return `${branding.displayName} is a modern CRM platform for sales teams. Import Excel & CSV leads, assign agents, track pipelines in real time, and close more deals.`;
  }
  return `${branding.displayName} (also known as ${branding.shortName} / Motherlands CRM) is a modern CRM platform for sales teams. Import Excel & CSV leads, assign agents, track pipelines in real time, and close more deals with Motherland CRM Solutions.`;
}

export function buildMetaTitle(branding: AppBranding): string {
  if (isVertexBrand(branding)) {
    return `${branding.displayName} – Modern CRM Solutions`;
  }
  return `${branding.displayName} | Motherland CRM – Modern CRM Solutions`;
}

/** Home OG title — Vertex stays Vertex-only; Motherland keeps alternate brand phrasing. */
export function buildHomeOpenGraphTitle(branding: AppBranding): string {
  if (isVertexBrand(branding)) {
    return `${branding.displayName} – CRM Software & Lead Management`;
  }
  return `${branding.displayName} | Motherland CRM Solutions`;
}

export function buildHomeOpenGraphDescription(branding: AppBranding): string {
  if (isVertexBrand(branding)) {
    return `${branding.displayName} — modern CRM software for lead import, team assignment, and real-time sales pipelines.`;
  }
  return `Motherland CRM — modern CRM software for lead import, team assignment, and real-time sales pipelines.`;
}

/** Rewrite hardcoded Motherland copy in marketing page descriptions for the active host brand. */
export function brandifyMarketingCopy(
  text: string,
  branding: AppBranding,
): string {
  if (!isVertexBrand(branding)) return text;
  return text
    .replaceAll("Motherland CRM Solutions", branding.displayName)
    .replaceAll("Motherlands CRM Solutions", branding.displayName)
    .replaceAll("Motherlands CRM", branding.shortName)
    .replaceAll("Motherland CRM", branding.displayName);
}

function brandAlternateNames(branding: AppBranding): string[] {
  if (isVertexBrand(branding)) {
    return [branding.shortName, "Vertex CRM", "Vertex CRM Solution"];
  }
  return [
    branding.shortName,
    "Motherland CRM",
    "Motherlands CRM",
    "Motherland CRM Solutions",
    "Motherlands CRM Solutions",
  ];
}

export function buildAppMetadata(branding: AppBranding): Metadata {
  const description = buildMetaDescription(branding);
  const keywords = buildBrandKeywords(branding);
  const titleDefault = buildMetaTitle(branding);
  const ogImageAlt = isVertexBrand(branding)
    ? `${branding.shortName} – Modern CRM Solutions`
    : `${branding.shortName} – Motherland CRM Solutions`;

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
          alt: ogImageAlt,
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
          url: "/favicon.ico",
          type: "image/x-icon",
          sizes: "16x16 32x32 48x48",
        },
        {
          url: "/motherland-favicon.svg",
          type: "image/svg+xml",
          sizes: "any",
        },
      ],
      apple: [
        {
          url: "/apple-touch-icon.png",
          type: "image/png",
          sizes: "180x180",
        },
      ],
      shortcut: [
        {
          url: "/favicon.ico",
          type: "image/x-icon",
        },
      ],
    },
  };
}

export function buildStructuredData(branding: AppBranding) {
  const keywords = buildBrandKeywords(branding);
  const description = isVertexBrand(branding)
    ? `${branding.displayName} is a CRM software platform for lead management, Excel & CSV import, team assignment, and real-time sales pipelines.`
    : `${branding.displayName} is a CRM software platform for lead management, Excel & CSV import, team assignment, and real-time sales pipelines. Also known as Motherland CRM and Motherlands CRM Solutions.`;
  const alternateNames = brandAlternateNames(branding);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${branding.origin}/#organization`,
        name: branding.displayName,
        alternateName: alternateNames,
        url: branding.origin,
        email: branding.supportEmail,
        logo: `${branding.origin}/Motherlandfav.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${branding.origin}/#website`,
        name: branding.displayName,
        alternateName: [...alternateNames, "CRM"],
        url: branding.origin,
        description,
        publisher: { "@id": `${branding.origin}/#organization` },
        inLanguage: "en-US",
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${branding.origin}/#app`,
        name: branding.shortName,
        alternateName: [branding.displayName, ...alternateNames],
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

/** Which white-label site an ADMIN registered on (stored on the user doc). */
export type SignupBrand = "motherland" | "vertex";

export function resolveSignupBrand(host?: string | null): SignupBrand {
  return resolveBrandHost(host) === "vertexcrmsolution.com"
    ? "vertex"
    : "motherland";
}

export function signupBrandLabel(brand?: SignupBrand | string | null): string {
  if (brand === "vertex") return "Vertex";
  if (brand === "motherland") return "Motherland";
  return "Unknown";
}
