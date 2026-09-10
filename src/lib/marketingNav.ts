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
  { label: "Terms", href: "/terms" },
] as const;

/** Extra marketing routes (not in the top nav) that share public scroll/theme. */
const MARKETING_EXTRA_PATHS = ["/terms"] as const;

export function isMarketingPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  if (
    (MARKETING_EXTRA_PATHS as readonly string[]).includes(pathname)
  ) {
    return true;
  }
  return MARKETING_NAV_LINKS.some((link) => link.href === pathname);
}
