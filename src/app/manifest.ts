import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { getBrandingForHost } from "@/lib/appBranding";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const branding = getBrandingForHost(host);

  return {
    name: `${branding.displayName} - Modern CRM Solution`,
    short_name: branding.shortName,
    description: `Transform your Excel & CSV data into actionable leads with ${branding.displayName}`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#2D6F8B",
    icons: [
      {
        src: "/motherland-favicon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/motherland-favicon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
