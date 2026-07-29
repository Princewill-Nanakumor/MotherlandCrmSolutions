import type { Metadata } from "next";
import { headers } from "next/headers";
import HomePageClient from "@/components/homepageComponents/HomePageClient";
import {
  buildBrandKeywords,
  getBrandingForHost,
} from "@/lib/appBranding";

export async function generateMetadata(): Promise<Metadata> {
  const headersList = await headers();
  const host =
    headersList.get("x-forwarded-host") || headersList.get("host") || "";
  const branding = getBrandingForHost(host);
  const keywords = buildBrandKeywords(branding);

  return {
    title: `${branding.displayName} | Motherland CRM – CRM Software & Lead Management`,
    description: `${branding.displayName} (Motherland CRM / Motherlands CRM Solutions) is a real-time CRM for sales teams. Import Excel & CSV leads, assign agents, manage pipelines, and close deals faster.`,
    keywords,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: `${branding.displayName} | Motherland CRM Solutions`,
      description: `Motherland CRM — modern CRM software for lead import, team assignment, and real-time sales pipelines.`,
      url: branding.origin,
      type: "website",
    },
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
