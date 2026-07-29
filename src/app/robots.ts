import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.CANONICAL_APP_URL?.trim() ||
  process.env.NEXTAUTH_URL?.trim() ||
  process.env.NEXT_PUBLIC_APP_URL?.trim() ||
  "https://motherlandcrmsolutions.com";

/** Public marketing + auth routes crawlers may index. */
const PUBLIC_ALLOW = ["/", "/login", "/signup"] as const;

/** Private app surfaces — keep out of search / AI training crawls. */
const PRIVATE_DISALLOW = [
  "/dashboard",
  "/api",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
] as const;

/** Major search + AI bots that should see the public Motherland CRM site. */
const AI_AND_SEARCH_BOTS = [
  "Googlebot",
  "Google-Extended",
  "Bingbot",
  "Slurp",
  "DuckDuckBot",
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "PerplexityBot",
  "Applebot",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
  "meta-externalagent",
] as const;

export default function robots(): MetadataRoute.Robots {
  const base = SITE_URL.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: [...PUBLIC_ALLOW, "/llms.txt", "/sitemap.xml", "/robots.txt"],
        disallow: [...PRIVATE_DISALLOW],
      },
      {
        userAgent: [...AI_AND_SEARCH_BOTS],
        allow: [...PUBLIC_ALLOW, "/llms.txt"],
        disallow: [...PRIVATE_DISALLOW],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base.replace(/^https?:\/\//, ""),
  };
}
