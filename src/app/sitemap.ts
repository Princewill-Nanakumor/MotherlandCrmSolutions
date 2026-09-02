import type { MetadataRoute } from "next";
import { MARKETING_NAV_LINKS } from "@/lib/marketingNav";

const SITE_URL =
  process.env.CANONICAL_APP_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://motherlandcrmsolutions.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, "");
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...MARKETING_NAV_LINKS.map((link) => ({
      url: `${base}${link.href}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    {
      url: `${base}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${base}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
