// src/components/homepageComponents/homepageContent.ts
import {
  Activity,
  BellRing,
  Download,
  Filter,
  LayoutDashboard,
  Megaphone,
  Palette,
  Phone,
  Radio,
  Rocket,
  SunMoon,
  Tags,
  Target,
  TrendingUp,
  Upload,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type HomeFeatureVisual =
  | "leads"
  | "import"
  | "team"
  | "live"
  | "reminders"
  | "activity"
  | "filters"
  | "phone"
  | "dashboard"
  | "brand"
  | "billing";

export type HomeFeature = {
  icon: LucideIcon;
  /** Small uppercase product/category label above the title. */
  label: string;
  title: string;
  description: string;
  visual: HomeFeatureVisual;
  /** Optional: mark as a wide/featured card in the bento grid. */
  featured?: boolean;
};

/** Real product capabilities, surfaced as marketing feature cards. */
export const HOME_FEATURES: HomeFeature[] = [
  {
    icon: Target,
    label: "Pipeline",
    title: "Lead management",
    description:
      "Add leads, set custom colored statuses, track source and country, and move every deal through your pipeline.",
    visual: "leads",
    featured: true,
  },
  {
    icon: Upload,
    label: "Import",
    title: "Excel & CSV import",
    description:
      "Import thousands of leads from spreadsheets, review import history, and export back out when you need to.",
    visual: "import",
    featured: true,
  },
  {
    icon: UsersRound,
    label: "Team",
    title: "Team roles & assignment",
    description:
      "Invite Admins and Agents, then assign or unassign leads in bulk so each rep only sees their queue.",
    visual: "team",
  },
  {
    icon: Radio,
    label: "Realtime",
    title: "Live team updates",
    description:
      "Comments, status changes, and assignments appear for everyone instantly — no refresh, no missed notes.",
    visual: "live",
  },
  {
    icon: BellRing,
    label: "Follow-ups",
    title: "Reminders & follow-ups",
    description:
      "Schedule follow-ups on any lead, snooze them, and get alerts so callbacks never slip through.",
    visual: "reminders",
  },
  {
    icon: Activity,
    label: "Timeline",
    title: "Comments & activity",
    description:
      "A full timeline of comments, status changes, and assignment history lives on every lead.",
    visual: "activity",
  },
  {
    icon: Filter,
    label: "Search",
    title: "Smart filters & search",
    description:
      "Filter by status, source, country, or owner — and search by name, email, or phone in seconds.",
    visual: "filters",
  },
  {
    icon: Phone,
    label: "Calling",
    title: "One-click softphone",
    description:
      "Call with Zoiper or MicroSIP from the lead card and keep call logs with the rest of the history.",
    visual: "phone",
  },
  {
    icon: LayoutDashboard,
    label: "Overview",
    title: "Dashboard overview",
    description:
      "See total leads, active users, and assigned vs unassigned at a glance — built for daily sales ops.",
    visual: "dashboard",
  },
  {
    icon: Palette,
    label: "Branding",
    title: "Your brand, your CRM",
    description:
      "Customize colors, fonts, and button style so the workspace matches your company identity.",
    visual: "brand",
  },
  {
    icon: Wallet,
    label: "Billing",
    title: "Crypto billing",
    description:
      "Deposit USDT, subscribe monthly, and start with a free trial — no credit card required.",
    visual: "billing",
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

export type HomeFeatureTab = {
  id: string;
  tab: string;
  icon: LucideIcon;
  /** Left-column title; use `accent` for the highlighted trailing word. */
  headline: string;
  accent: string;
  description: string;
};

/** Tabbed “more features” section (statuses, theme, export, ads). */
export const HOME_FEATURE_TABS: HomeFeatureTab[] = [
  {
    id: "statuses",
    tab: "Statuses",
    icon: Tags,
    headline: "Custom statuses.",
    accent: "Done.",
    description:
      "Add Status with your own colors, move leads through the pipeline, and bulk-change status when the deal moves.",
  },
  {
    id: "theme",
    tab: "Dark & light",
    icon: SunMoon,
    headline: "Dark & light mode.",
    accent: "Ready.",
    description:
      "Toggle the dashboard between dark and light themes so agents and admins can work in the look they prefer.",
  },
  {
    id: "export",
    tab: "Export",
    icon: Download,
    headline: "Lead export.",
    accent: "CSV.",
    description:
      "Export every lead — or one import batch — as CSV for backups, reports, or handing data off in a spreadsheet.",
  },
  {
    id: "ads",
    tab: "Ads",
    icon: Megaphone,
    headline: "Motivation on every lead.",
    accent: "Built-in.",
    description:
      "View the Ads section in lead details for an auto-rotating feed of sales tips that keep agents focused while they work the deal.",
  },
];

/** @deprecated Prefer HOME_FEATURE_TABS — kept for any leftover imports. */
export type HomeAudience = HomeFeatureTab;
export const HOME_AUDIENCES = HOME_FEATURE_TABS;

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
