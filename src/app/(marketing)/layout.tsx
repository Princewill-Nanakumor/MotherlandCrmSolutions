"use client";

import { usePathname } from "next/navigation";
import { MarketingPageShell } from "@/components/homepageComponents/MarketingPageShell";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Contact already has Telegram / email CTAs — skip the shared trial band.
  const showCta = pathname !== "/contact";

  return <MarketingPageShell showCta={showCta}>{children}</MarketingPageShell>;
}
