import TermsPageContent from "@/components/homepageComponents/TermsPageContent";
import { marketingPageMetadata } from "@/lib/marketingPageMetadata";

export async function generateMetadata() {
  return marketingPageMetadata({
    title: "Terms and Conditions",
    description:
      "Terms and Conditions for using Motherland CRM: accounts, customer data, acceptable use, billing, and liability.",
    path: "/terms",
  });
}

export default function TermsPage() {
  return <TermsPageContent />;
}
