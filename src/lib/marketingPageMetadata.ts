import type { Metadata } from "next";
import { headers } from "next/headers";
import { getBrandingForHost } from "@/lib/appBranding";

export async function marketingPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Promise<Metadata> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const branding = getBrandingForHost(host);
  const url = `${branding.origin}${path}`;

  return {
    title: `${title} | ${branding.displayName}`,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${branding.displayName}`,
      description,
      url,
      type: "website",
    },
  };
}
