// src/components/homepageComponents/HomeFooter.tsx
"use client";

import Link from "next/link";
import { Coins, Mail, MessageCircle } from "lucide-react";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";

const PRODUCT_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function HomeFooter() {
  const { displayName, supportEmail, telegramHandle, telegramUrl } =
    useAppBranding();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="max-w-7xl px-6 py-14 mx-auto">
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
              The real-time CRM workspace to capture, assign, and close more
              leads — built for teams that move fast.
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
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Get in touch</h3>
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
                <Link
                  href="/login"
                  className="text-sm text-gray-600 transition-colors hover:text-(--brand-from)"
                >
                  Sign in
                </Link>
              </li>
              <li>
                <Link
                  href="/signup"
                  className="text-sm font-semibold text-(--brand-from) transition-colors hover:brightness-95"
                >
                  Start free trial
                </Link>
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
