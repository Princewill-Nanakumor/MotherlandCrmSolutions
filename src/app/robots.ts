import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.CANONICAL_APP_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://motherlandcrmsolutions.com";

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup"],
        disallow: [
          "/dashboard",
          "/api",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
