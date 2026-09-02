/** Public marketing routes shown in the homepage navbar and footer. */
export const MARKETING_NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
  { label: "Contact", href: "/contact" },
] as const;

export const MARKETING_FOOTER_PRODUCT_LINKS = [
  { label: "Features", href: "/features" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", href: "/#faq" },
] as const;

export const MARKETING_FOOTER_COMPANY_LINKS = [
  { label: "About", href: "/about" },
  { label: "Security", href: "/security" },
  { label: "Contact", href: "/contact" },
] as const;

export function isMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return MARKETING_NAV_LINKS.some((link) => link.href === pathname);
}
