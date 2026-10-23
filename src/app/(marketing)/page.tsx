import type { Metadata } from "next";
import { headers } from "next/headers";
import HomePageClient from "@/components/homepageComponents/HomePageClient";
import {
  buildBrandKeywords,
  buildHomeOpenGraphDescription,
  buildHomeOpenGraphTitle,
  buildMetaDescription,
  buildMetaTitle,
  getBrandingForHost,
} from "@/lib/appBranding";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const branding = getBrandingForHost(host);
  const keywords = buildBrandKeywords(branding);
  const title = buildMetaTitle(branding);
  const description = buildMetaDescription(branding);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: buildHomeOpenGraphTitle(branding),
      description: buildHomeOpenGraphDescription(branding),
      url: branding.origin,
      type: "website",
    },
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
