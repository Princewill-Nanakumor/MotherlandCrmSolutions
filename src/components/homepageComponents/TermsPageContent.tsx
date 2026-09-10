"use client";

import Link from "next/link";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { MarketingPageHero } from "@/components/homepageComponents/MarketingPageHero";
import {
  Eyebrow,
  SectionHeading,
} from "@/components/homepageComponents/primitives";

const LAST_UPDATED = "September 10, 2026";

type TermsSection = {
  title: string;
  paragraphs: string[];
  bullets?: string[];
};

function buildSections(displayName: string): TermsSection[] {
  return [
    {
      title: "1. Agreement to these terms",
      paragraphs: [
        `By accessing or using ${displayName} (the “Service”), you agree to these Terms and Conditions. If you do not agree, do not use the Service.`,
        "If you use the Service on behalf of a company or other organization, you represent that you have authority to bind that organization to these terms.",
      ],
    },
    {
      title: "2. The service",
      paragraphs: [
        `${displayName} is a customer-relationship management workspace for importing leads, assigning agents, tracking follow-ups, and related sales operations.`,
        "We may update features, availability, or interfaces from time to time. We will try to avoid disruptive changes, but we do not guarantee that any particular feature will remain unchanged forever.",
      ],
    },
    {
      title: "3. Accounts and access",
      paragraphs: [
        "You must provide accurate account information and keep your credentials confidential. You are responsible for activity under your account and for users you invite into your workspace.",
        "Workspace owners and admins control roles, permissions, and billing for their tenant. Agents and other staff must follow the access rules set by their workspace.",
      ],
      bullets: [
        "Do not share login credentials or attempt to access another tenant’s data.",
        "Notify us promptly if you suspect unauthorized access to your account.",
        "We may suspend accounts that put the Service or other customers at risk.",
      ],
    },
    {
      title: "4. Your data",
      paragraphs: [
        "You retain ownership of the leads, contacts, comments, and other content you upload or create in the Service (“Customer Data”).",
        `You grant ${displayName} a limited license to host, process, and display Customer Data solely to provide and improve the Service for your workspace.`,
        "You are responsible for having a lawful basis to collect and process the personal data you store in the Service, including any marketing or calling activity you run from it.",
      ],
    },
    {
      title: "5. Acceptable use",
      paragraphs: [
        "You agree not to misuse the Service. Prohibited conduct includes, without limitation:",
      ],
      bullets: [
        "Uploading unlawful, harmful, or infringing content.",
        "Attempting to probe, disrupt, or reverse-engineer the Service beyond ordinary use.",
        "Using the Service to spam, harass, or violate telemarketing or privacy laws.",
        "Circumventing usage limits, billing, or security controls.",
      ],
    },
    {
      title: "6. Subscriptions and payments",
      paragraphs: [
        "Paid plans, trials, and crypto billing (where offered) are described on our pricing pages and in your billing settings. Fees are due according to the plan you select.",
        "Unless otherwise stated, subscriptions renew until cancelled. Downgrades, upgrades, and cancellations take effect according to the billing rules shown at the time of change.",
        "Failed or disputed payments may result in restricted access until the account is brought current.",
      ],
    },
    {
      title: "7. Confidentiality and security",
      paragraphs: [
        "We implement administrative and technical measures designed to protect Customer Data, including role-based access and tenant-scoped workspaces. No method of transmission or storage is completely secure, and we cannot guarantee absolute security.",
        "You are responsible for configuring roles, dialer settings, and visibility permissions appropriately for your team.",
      ],
    },
    {
      title: "8. Third-party services",
      paragraphs: [
        "The Service may integrate with third-party tools such as dialers, payment processors, or messaging channels. Those services are governed by their own terms. We are not responsible for third-party outages or policies outside our control.",
      ],
    },
    {
      title: "9. Intellectual property",
      paragraphs: [
        `The Service, including software, branding, and documentation, is owned by ${displayName} or its licensors. These terms do not transfer any ownership rights to you other than the limited right to use the Service as permitted here.`,
      ],
    },
    {
      title: "10. Disclaimers",
      paragraphs: [
        'THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE DISCLAIM WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.',
        "We do not warrant that the Service will be uninterrupted, error-free, or that results from using it will meet your commercial expectations.",
      ],
    },
    {
      title: "11. Limitation of liability",
      paragraphs: [
        "To the maximum extent permitted by law, neither party is liable for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, or data, arising out of these terms or use of the Service.",
        "Our aggregate liability for claims relating to the Service is limited to the fees you paid us for the Service in the twelve (12) months before the claim arose (or, if none, one hundred US dollars).",
      ],
    },
    {
      title: "12. Termination",
      paragraphs: [
        "You may stop using the Service at any time. We may suspend or terminate access if you breach these terms, fail to pay, or create risk for the platform or other customers.",
        "Upon termination, your right to use the Service ends. We may delete or retain Customer Data according to our operational and legal retention needs, unless a separate written agreement says otherwise.",
      ],
    },
    {
      title: "13. Changes to these terms",
      paragraphs: [
        "We may update these Terms and Conditions from time to time. Material changes will be reflected on this page with an updated date. Continued use of the Service after changes become effective constitutes acceptance of the revised terms.",
      ],
    },
    {
      title: "14. Contact",
      paragraphs: [
        "Questions about these terms can be sent through our Contact page or the support email shown in the product.",
      ],
    },
  ];
}

export default function TermsPageContent() {
  const { displayName } = useAppBranding();
  const sections = buildSections(displayName);

  return (
    <>
      <MarketingPageHero
        eyebrow="Legal"
        title="Terms and"
        accent="Conditions"
        description={`The agreement that covers how you use ${displayName}, your workspace data, and our responsibilities as the service provider.`}
      />

      <section className="px-6 py-16 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <SectionHeading
            align="left"
            className="max-w-2xl"
            eyebrow={<Eyebrow>Effective</Eyebrow>}
            title={`Last updated ${LAST_UPDATED}`}
            subtitle="Please read these terms carefully before creating an account or continuing to use the Service."
          />

          <div className="mt-12 space-y-10">
            {sections.map((section) => (
              <article key={section.title} className="scroll-mt-28">
                <h2 className="text-xl font-semibold tracking-tight text-gray-900">
                  {section.title}
                </h2>
                <div className="mt-4 space-y-3 text-sm leading-relaxed text-gray-600">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph.slice(0, 48)}>{paragraph}</p>
                  ))}
                  {section.bullets ? (
                    <ul className="pl-5 space-y-2 list-disc">
                      {section.bullets.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <p className="mt-14 text-sm text-gray-500">
            Need help?{" "}
            <Link
              href="/contact"
              className="font-medium text-(--brand-from) hover:underline"
            >
              Contact us
            </Link>
            .
          </p>
        </div>
      </section>
    </>
  );
}
