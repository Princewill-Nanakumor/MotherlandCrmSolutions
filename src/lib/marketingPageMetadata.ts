import type { Metadata } from "next";
import { headers } from "next/headers";
import {
  brandifyMarketingCopy,
  getBrandingForHost,
} from "@/lib/appBranding";

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
  const brandedDescription = brandifyMarketingCopy(description, branding);

  return {
    title: `${title} | ${branding.displayName}`,
    description: brandedDescription,
    alternates: { canonical: path },
    openGraph: {
      title: `${title} | ${branding.displayName}`,
      description: brandedDescription,
      url,
      type: "website",
    },
  };
}
