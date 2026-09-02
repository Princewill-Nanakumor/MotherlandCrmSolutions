import ContactPageContent from "@/components/homepageComponents/ContactPageContent";
import { marketingPageMetadata } from "@/lib/marketingPageMetadata";

export async function generateMetadata() {
  return marketingPageMetadata({
    title: "Contact",
    description:
      "Contact Motherland CRM on Telegram or email. Ask about trials, plans, or migrating your lead book.",
    path: "/contact",
  });
}

export default function ContactPage() {
  return <ContactPageContent />;
}
