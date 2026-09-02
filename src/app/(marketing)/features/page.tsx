import FeaturesPageContent from "@/components/homepageComponents/FeaturesPageContent";
import { marketingPageMetadata } from "@/lib/marketingPageMetadata";

export async function generateMetadata() {
  return marketingPageMetadata({
    title: "Features",
    description:
      "Explore Motherland CRM features: Excel & CSV import, live assignment, reminders, calling, filters, branding, and crypto billing.",
    path: "/features",
  });
}

export default function FeaturesPage() {
  return <FeaturesPageContent />;
}
