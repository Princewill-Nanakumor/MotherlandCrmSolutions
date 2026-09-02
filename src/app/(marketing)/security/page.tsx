import SecurityPageContent from "@/components/homepageComponents/SecurityPageContent";
import { marketingPageMetadata } from "@/lib/marketingPageMetadata";

export async function generateMetadata() {
  return marketingPageMetadata({
    title: "Security",
    description:
      "How Motherland CRM protects your pipeline: role-based access, tenant isolation, session-aware APIs, and a full activity trail.",
    path: "/security",
  });
}

export default function SecurityPage() {
  return <SecurityPageContent />;
}
