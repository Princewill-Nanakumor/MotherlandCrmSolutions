"use client";

import { Mail, MessageCircle } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MarketingPageHero } from "@/components/homepageComponents/MarketingPageHero";
import {
  Eyebrow,
  RevealGroup,
  SectionHeading,
  revealItem,
} from "@/components/homepageComponents/primitives";
import { CONTACT_CHANNELS } from "@/components/homepageComponents/marketingPagesContent";

export default function ContactPageContent() {
  const { supportEmail, telegramHandle, telegramUrl } = useAppBranding();
  const reduce = useReducedMotion();

  return (
    <>
      <MarketingPageHero
        eyebrow="Contact"
        title="Talk to the team"
        accent="behind the CRM."
        description="Whether you are migrating a spreadsheet book or already on a trial, we answer on Telegram and email."
      />

      <section className="px-6 py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            eyebrow={<Eyebrow>Reach us</Eyebrow>}
            title="Pick the channel that fits"
            subtitle="Sales questions go to Telegram. Workspace support goes to email."
          />
          <RevealGroup className="grid gap-6 mt-14 md:grid-cols-2">
            {CONTACT_CHANNELS.map((channel) => {
              const Icon = channel.icon;
              const isTelegram = channel.kind === "telegram" && telegramUrl;
              const href = isTelegram
                ? telegramUrl
                : `mailto:${supportEmail}`;
              const label = isTelegram
                ? telegramHandle || "Telegram"
                : supportEmail;
              return (
                <motion.a
                  key={channel.title}
                  href={href}
                  target={isTelegram ? "_blank" : undefined}
                  rel={isTelegram ? "noopener noreferrer" : undefined}
                  variants={reduce ? undefined : revealItem}
                  className="group p-8 bg-white border border-gray-200 rounded-3xl shadow-sm transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <span className="flex items-center justify-center w-12 h-12 rounded-2xl brand-soft-bg">
                    <Icon className="w-5 h-5 brand-icon" />
                  </span>
                  <h3 className="mt-5 text-xl font-semibold text-gray-900">
                    {channel.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-gray-600">
                    {channel.description}
                  </p>
                  <p className="inline-flex items-center gap-2 mt-5 text-sm font-semibold text-(--brand-from)">
                    {isTelegram ? (
                      <MessageCircle className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                    {label}
                  </p>
                </motion.a>
              );
            })}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
