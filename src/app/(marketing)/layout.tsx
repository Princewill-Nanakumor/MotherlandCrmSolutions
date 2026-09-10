"use client";

import { usePathname } from "next/navigation";
import { MarketingPageShell } from "@/components/homepageComponents/MarketingPageShell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Homepage already includes its own CTA band; contact/terms skip the promo band.
  const showCta =
    pathname !== "/contact" && pathname !== "/" && pathname !== "/terms";

  return <MarketingPageShell showCta={showCta}>{children}</MarketingPageShell>;
}
