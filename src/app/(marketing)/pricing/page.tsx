import PricingPageContent from "@/components/homepageComponents/PricingPageContent";
import { marketingPageMetadata } from "@/lib/marketingPageMetadata";

export async function generateMetadata() {
  return marketingPageMetadata({
    title: "Pricing",
    description:
      "Motherland CRM pricing: 3-day free trial, then monthly Starter, Professional, or Enterprise plans billed in USDT.",
    path: "/pricing",
  });
}

export default function PricingPage() {
  return <PricingPageContent />;
}
