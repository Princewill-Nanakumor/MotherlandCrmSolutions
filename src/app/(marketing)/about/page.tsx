import AboutPageContent from "@/components/homepageComponents/AboutPageContent";
import { marketingPageMetadata } from "@/lib/marketingPageMetadata";

export async function generateMetadata() {
  return marketingPageMetadata({
    title: "About",
    description:
      "Motherland CRM is a real-time CRM for sales teams — import leads, assign agents, and close deals from one branded workspace.",
    path: "/about",
  });
}

export default function AboutPage() {
  return <AboutPageContent />;
}
