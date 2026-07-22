// src/components/homepageComponents/homepageContent.ts
import {
  Activity,
  BellRing,
  Building2,
  Filter,
  LayoutDashboard,
  Palette,
  Radio,
  ShieldCheck,
  Target,
  Upload,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type HomeFeature = {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Optional: mark as a wide/featured card in the bento grid. */
  featured?: boolean;
};

/** Real product capabilities, surfaced as marketing feature cards. */
export const HOME_FEATURES: HomeFeature[] = [
  {
    icon: Target,
    title: "Lead management",
    description:
      "Capture, assign, and move every lead through a pipeline with custom statuses, sources, and owners.",
    featured: true,
  },
  {
    icon: Radio,
    title: "Real-time collaboration",
    description:
      "Assignments, status changes, and comments sync live across your whole team — no refresh needed.",
    featured: true,
  },
  {
    icon: Upload,
    title: "Bulk CSV / Excel import",
    description:
      "Bring in thousands of leads in seconds with smart field mapping and duplicate handling.",
  },
  {
    icon: UsersRound,
    title: "Team roles & assignment",
    description:
      "Invite agents, route leads, and control who sees what with admin and agent permissions.",
  },
  {
    icon: BellRing,
    title: "Reminders & follow-ups",
    description:
      "Schedule follow-ups and get in-app notifications so no lead ever slips through the cracks.",
  },
  {
    icon: Activity,
    title: "Activity timeline",
    description:
      "Every call, comment, and status change is logged in a complete, auditable history.",
  },
  {
    icon: Filter,
    title: "Smart filters",
    description:
      "Slice leads by country, status, source, or owner with powerful include / exclude filters.",
  },
  {
    icon: Palette,
    title: "White-label branding",
    description:
      "Make it yours — custom colors, logo, and favicon apply instantly across the entire app.",
  },
  {
    icon: Wallet,
    title: "Secure crypto billing",
    description:
      "Pay with USDT and major cryptocurrencies. No credit card required to get started.",
  },
];

export type HomeStat = {
  value: string;
  label: string;
};

export const HOME_STATS: HomeStat[] = [
  { value: "Real-time", label: "Live lead sync across your team" },
  { value: "3-day", label: "Free trial, no card required" },
  { value: "Unlimited", label: "Leads & seats on Enterprise" },
  { value: "White-label", label: "Fully brandable workspace" },
];

export type HomeStep = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const HOME_STEPS: HomeStep[] = [
  {
    icon: Upload,
    title: "Import or capture",
    description:
      "Upload your existing leads via CSV/Excel or start adding them directly. Setup takes minutes.",
  },
  {
    icon: LayoutDashboard,
    title: "Assign & track",
    description:
      "Route leads to the right agents and watch your pipeline update in real time as work happens.",
  },
  {
    icon: BellRing,
    title: "Follow up & close",
    description:
      "Reminders and the activity timeline keep every deal moving until it's won.",
  },
];

export type HomeAudience = {
  icon: LucideIcon;
  title: string;
  description: string;
};

export const HOME_AUDIENCES: HomeAudience[] = [
  {
    icon: Building2,
    title: "Sales teams",
    description:
      "Keep every rep aligned with a shared, always-current view of the pipeline.",
  },
  {
    icon: UsersRound,
    title: "Agencies",
    description:
      "Manage leads for multiple clients with white-label branding per workspace.",
  },
  {
    icon: ShieldCheck,
    title: "Growing businesses",
    description:
      "Scale from your first 10,000 leads to unlimited without switching tools.",
  },
];

export type HomeFaq = {
  question: string;
  answer: string;
};

export const HOME_FAQS: HomeFaq[] = [
  {
    question: "Do I need a credit card to start?",
    answer:
      "No. You get a 3-day free trial with no card required. When you're ready, you can subscribe using cryptocurrency.",
  },
  {
    question: "How do payments work?",
    answer:
      "Subscriptions are billed monthly and paid in crypto — USDT (TRC20), Bitcoin, Ethereum, and more are accepted.",
  },
  {
    question: "Can I import my existing leads?",
    answer:
      "Yes. Import thousands of leads at once from CSV or Excel with smart field mapping, on any paid plan.",
  },
  {
    question: "Can I invite my team?",
    answer:
      "Absolutely. Add agents, assign leads, and control access with roles — up to unlimited members on Enterprise.",
  },
  {
    question: "Is my data secure?",
    answer:
      "Every workspace is isolated, protected by email verification, security verification on login, and role-based access control.",
  },
  {
    question: "Can I customize the branding?",
    answer:
      "Yes. Set your own colors, logo, and favicon in Appearance settings and they apply across the whole app.",
  },
];
