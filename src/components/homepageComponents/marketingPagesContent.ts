import {
  Building2,
  Eye,
  Globe2,
  Handshake,
  Lock,
  Radio,
  ShieldCheck,
  Sparkles,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const ABOUT_VALUES: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: Sparkles,
    title: "Built for speed",
    description:
      "Sales desks move in minutes, not quarters. Every screen is designed so agents can import, assign, and follow up without waiting.",
  },
  {
    icon: Radio,
    title: "Live by default",
    description:
      "Comments, statuses, and assignments land for the whole team instantly — so nobody works from a stale spreadsheet.",
  },
  {
    icon: Handshake,
    title: "Clear ownership",
    description:
      "Admins see the full pipeline. Agents only see their queue. That split keeps accountability tight without extra process.",
  },
  {
    icon: Globe2,
    title: "Ready to brand",
    description:
      "Colors, fonts, and identity belong to your company. Motherland CRM is the engine — your workspace still looks like you.",
  },
];

export const ABOUT_MILESTONES: Array<{
  year: string;
  title: string;
  description: string;
}> = [
  {
    year: "01",
    title: "One workspace",
    description:
      "Replace scattered sheets and chat threads with a single CRM that your whole desk can open at once.",
  },
  {
    year: "02",
    title: "Import and assign",
    description:
      "Bring Excel or CSV leads in, then route them to agents in bulk so the queue starts moving the same day.",
  },
  {
    year: "03",
    title: "Follow through",
    description:
      "Reminders, call logs, and a full activity timeline keep every deal warm until it is won.",
  },
];

export const SECURITY_PILLARS: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
}> = [
  {
    icon: UsersRound,
    title: "Role-based access",
    description:
      "Administrators, sub-admins, and agents each see only what their role allows. Agents never browse the full book.",
  },
  {
    icon: Lock,
    title: "Session-aware APIs",
    description:
      "Authenticated routes check the signed-in user on every request. Expired or blocked sessions cannot keep working the pipeline.",
  },
  {
    icon: ShieldCheck,
    title: "Tenant isolation",
    description:
      "Leads, statuses, and billing stay scoped to your workspace. One company never reads another company's book.",
  },
  {
    icon: Eye,
    title: "Contact masking",
    description:
      "Phone and email can stay masked for roles that should not see full contact details — useful on shared floors.",
  },
  {
    icon: Radio,
    title: "Realtime without oversharing",
    description:
      "Live events are published on tenant channels, so status changes reach your team — not the rest of the internet.",
  },
  {
    icon: Wallet,
    title: "Crypto billing you control",
    description:
      "Deposit USDT, subscribe monthly, and start with a trial. No card on file for the trial period.",
  },
];

export const SECURITY_PRACTICES: Array<{ title: string; body: string }> = [
  {
    title: "Least privilege",
    body: "Bulk assign, billing, branding, and user management stay with admins. Agents work assigned leads only.",
  },
  {
    title: "Audit trail",
    body: "Status changes, comments, assignments, and calls land on the lead timeline so managers can reconstruct what happened.",
  },
  {
    title: "Operational hygiene",
    body: "Signed-in sessions, CSRF-protected auth, and private dashboard routes keep the CRM off public indexes.",
  },
];

export const CONTACT_CHANNELS: Array<{
  icon: LucideIcon;
  title: string;
  description: string;
  kind: "email" | "telegram" | "office";
}> = [
  {
    icon: Handshake,
    title: "Talk to sales",
    description:
      "Questions about plans, trials, or migrating a spreadsheet book? We reply on Telegram and email.",
    kind: "telegram",
  },
  {
    icon: Building2,
    title: "Support",
    description:
      "Already on a workspace? Email us with the account address and we will pick it up from there.",
    kind: "email",
  },
];
