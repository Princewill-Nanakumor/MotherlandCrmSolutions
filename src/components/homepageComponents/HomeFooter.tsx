// src/components/homepageComponents/HomeFooter.tsx
"use client";

import Link from "next/link";
import { Coins, Mail, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import { hasAuthorizedSession } from "@/lib/sessionUtils";

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
] as const;

function scrollToHomepageSection(hash: string) {
  const id = hash.replace(/^#/, "");
  const target = document.getElementById(id);
  if (!target) return;

  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;

  target.scrollIntoView({
    behavior: prefersReducedMotion ? "auto" : "smooth",
    block: "start",
  });

  // Keep the hash in the URL without a jump (history only).
  if (window.location.hash !== hash) {
    window.history.pushState(null, "", hash);
  }
}

export default function HomeFooter() {
  const { displayName, supportEmail, telegramHandle, telegramUrl } =
    useAppBranding();
  const { data: session, status } = useSession();
  const isAuthed = hasAuthorizedSession(status, session);
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="px-6 mx-auto max-w-7xl py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <MotherlandLogo
                className="w-10 h-10 rounded-xl shrink-0"
                title={`${displayName} Logo`}
              />
              <span className="text-lg font-bold text-gray-900">
                {displayName}
              </span>
            </Link>
            <p className="max-w-sm mt-4 text-sm leading-relaxed text-gray-600">
              The CRM to import leads, assign agents, follow up on time, and
              close more deals — with live updates and crypto billing.
            </p>
            <div className="inline-flex items-center gap-2 px-3 py-2 mt-5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg">
              <Coins className="w-4 h-4 text-amber-500" />
              Crypto payments: USDT, Bitcoin, Ethereum & more
            </div>
          </div>

          {/* Product links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Product</h3>
            <ul className="mt-4 space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm text-gray-600 transition-colors hover:text-(--brand-from)"
                    onClick={(event) => {
                      event.preventDefault();
                      scrollToHomepageSection(link.href);
                    }}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Get in touch
            </h3>
            <ul className="mt-4 space-y-3">
              {telegramUrl && telegramHandle ? (
                <li>
                  <a
                    href={telegramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-(--brand-from)"
                  >
                    <MessageCircle className="w-4 h-4" />
                    {telegramHandle}
                  </a>
                </li>
              ) : null}
              <li>
                <a
                  href={`mailto:${supportEmail}`}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 transition-colors hover:text-(--brand-from)"
                >
                  <Mail className="w-4 h-4" />
                  {supportEmail}
                </a>
              </li>
              <li>
                <p className="text-sm text-gray-600 ">Sign in</p>
              </li>
              <li>
                {status === "loading" ? (
                  <div className="h-5 w-28 rounded bg-gray-200 animate-pulse" />
                ) : (
                  <Link
                    href={isAuthed ? "/dashboard" : "/signup"}
                    className="text-sm font-semibold text-gray-600 transition-colors hover:text-(--brand-from)"
                  >
                    {isAuthed ? "Go to dashboard" : "Start free trial"}
                  </Link>
                )}
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-8 mt-10 text-sm text-gray-500 border-t border-gray-200 sm:flex-row">
          <p>
            &copy; {year} {displayName}. All rights reserved.
          </p>
          <p>Made for teams that close.</p>
        </div>
      </div>
    </footer>
  );
}
