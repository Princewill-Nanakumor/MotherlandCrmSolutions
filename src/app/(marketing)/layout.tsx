"use client";

import { usePathname } from "next/navigation";
import { MarketingPageShell } from "@/components/homepageComponents/MarketingPageShell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Homepage already includes its own CTA band; contact has channel cards.
  const showCta = pathname !== "/contact" && pathname !== "/";

  return <MarketingPageShell showCta={showCta}>{children}</MarketingPageShell>;
}
