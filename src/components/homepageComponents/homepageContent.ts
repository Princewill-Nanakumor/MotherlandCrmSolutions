// src/components/homepageComponents/homepageContent.ts
import {
  Activity,
  BellRing,
  Building2,
  Filter,
  LayoutDashboard,
  Palette,
  Phone,
  Radio,
  Rocket,
  ShieldCheck,
  Target,
  TrendingUp,
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
      "Add leads, set custom colored statuses, track source and country, and move every deal through your pipeline.",
    featured: true,
  },
  {
    icon: Upload,
    title: "Excel & CSV import",
    description:
      "Import thousands of leads from spreadsheets, review import history, and export back out when you need to.",
    featured: true,
  },
  {
    icon: UsersRound,
    title: "Team roles & assignment",
    description:
      "Invite Admins and Agents, then assign or unassign leads in bulk so each rep only sees their queue.",
  },
  {
    icon: Radio,
    title: "Live team updates",
    description:
      "Comments, status changes, and assignments appear for everyone instantly — no refresh, no missed notes.",
  },
  {
    icon: BellRing,
    title: "Reminders & follow-ups",
    description:
      "Schedule follow-ups on any lead, snooze them, and get alerts so callbacks never slip through.",
  },
  {
    icon: Activity,
    title: "Comments & activity",
    description:
      "A full timeline of comments, status changes, and assignment history lives on every lead.",
  },
  {
    icon: Filter,
    title: "Smart filters & search",
    description:
      "Filter by status, source, country, or owner — and search by name, email, or phone in seconds.",
  },
  {
    icon: Phone,
    title: "One-click softphone",
    description:
      "Call with Zoiper or MicroSIP from the lead card and keep call logs with the rest of the history.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard overview",
    description:
      "See total leads, active users, and assigned vs unassigned at a glance — built for daily sales ops.",
  },
  {
    icon: Palette,
    title: "Your brand, your CRM",
    description:
      "Customize colors, fonts, and button style so the workspace matches your company identity.",
  },
  {
    icon: Wallet,
    title: "Crypto billing",
    description:
      "Deposit USDT, subscribe monthly, and start with a free trial — no credit card required.",
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

/** Stats strip shown under the hero. */
export type HomeNumberStat = {
  value: string;
  label: string;
};

export const HOME_NUMBER_STATS: HomeNumberStat[] = [
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
      "Upload your existing leads via CSV/Excel or add them one by one. Setup takes minutes.",
  },
  {
    icon: LayoutDashboard,
    title: "Assign & track",
    description:
      "Route leads to the right agents and watch statuses and comments update live.",
  },
  {
    icon: BellRing,
    title: "Follow up & close",
    description:
      "Reminders, call logs, and the activity timeline keep every deal moving until it's won.",
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
      "Share one live pipeline — assign leads, leave comments, and hit follow-ups together.",
  },
  {
    icon: UsersRound,
    title: "Call centers & agencies",
    description:
      "Give agents only their assigned leads, dial with Zoiper/MicroSIP, and keep every note on the record.",
  },
  {
    icon: ShieldCheck,
    title: "Growing businesses",
    description:
      "Start small, import your spreadsheet, and scale to tens of thousands of leads without switching tools.",
  },
];

export type HomeJourneyMilestone = {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
};

/** Onboarding journey rendered as an animated vertical timeline. */
export const HOME_JOURNEY: HomeJourneyMilestone[] = [
  {
    icon: Rocket,
    step: "01",
    title: "Create your account",
    description:
      "Sign up in seconds and start your 3-day free trial — no credit card needed.",
  },
  {
    icon: Upload,
    step: "02",
    title: "Import your leads",
    description:
      "Bring in contacts from Excel or CSV, or add them manually with status and source.",
  },
  {
    icon: UsersRound,
    step: "03",
    title: "Invite your team",
    description:
      "Add agents, assign leads, and control who sees what with Admin and Agent roles.",
  },
  {
    icon: BellRing,
    step: "04",
    title: "Set follow-ups",
    description:
      "Create reminders, leave comments, and dial leads with your preferred softphone.",
  },
  {
    icon: TrendingUp,
    step: "05",
    title: "Track and close",
    description:
      "Move statuses, watch the dashboard, and keep every deal moving until it's won.",
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
      "No. You get a 3-day free trial with no card required. When you're ready, deposit USDT and subscribe to a monthly plan.",
  },
  {
    question: "How do payments work?",
    answer:
      "Deposit cryptocurrency (USDT on TRC20 or ERC20) to your balance, then subscribe. Cards are coming soon.",
  },
  {
    question: "Can I import my existing leads?",
    answer:
      "Yes. Import Excel (.xlsx) or CSV with name, email, phone, and country — plus optional source — then review import history anytime.",
  },
  {
    question: "Can I invite my team?",
    answer:
      "Yes. Create Administrators, Sub Administrators, and Agents. Agents only see leads assigned to them.",
  },
  {
    question: "What can agents do?",
    answer:
      "Agents work their assigned leads — update status, leave comments, set reminders, and place calls. Admins manage users, import, billing, and the full pipeline.",
  },
  {
    question: "Can I customize the branding?",
    answer:
      "Yes. Admins can set colors, fonts, and button style in Appearance settings so the CRM matches your brand.",
  },
];
