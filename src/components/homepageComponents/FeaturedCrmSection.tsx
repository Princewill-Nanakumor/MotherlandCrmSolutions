// src/components/homepageComponents/FeaturedCrmSection.tsx
"use client";

import {
  Activity,
  BellRing,
  Filter,
  MessageSquareText,
  Phone,
  Target,
  Upload,
  UsersRound,
} from "lucide-react";
import {
  Eyebrow,
  SectionHeading,
} from "@/components/homepageComponents/primitives";
import {
  StickyStory,
  type StoryStep,
} from "@/components/homepageComponents/StickyStory";
import {
  AnalyticsVisual,
  FiltersVisual,
  ImportVisual,
  LeadPipelineVisual,
  NotificationsVisual,
  RealtimeVisual,
  SoftphoneVisual,
  TeamAssignVisual,
} from "@/components/homepageComponents/CrmStepVisuals";

const STEPS: StoryStep[] = [
  {
    id: "leads",
    eyebrow: "Step 1 · Pipeline",
    title: "Manage every lead in one place",
    description:
      "Add leads, set custom statuses with colors, and move deals from New to Won — with full contact details, source, and ownership on every record.",
    icon: Target,
    visual: <LeadPipelineVisual />,
  },
  {
    id: "import",
    eyebrow: "Step 2 · Import",
    title: "Import from Excel & CSV",
    description:
      "Upload thousands of leads at once. Map name, email, phone, country, and source, then keep going with import history and CSV export.",
    icon: Upload,
    visual: <ImportVisual />,
  },
  {
    id: "assign",
    eyebrow: "Step 3 · Team",
    title: "Assign leads to your agents",
    description:
      "Invite Administrators, Sub Admins, and Agents. Bulk-assign or unassign leads so every rep only works the opportunities that belong to them.",
    icon: UsersRound,
    visual: <TeamAssignVisual />,
  },
  {
    id: "collaborate",
    eyebrow: "Step 4 · Collaboration",
    title: "Comment and collaborate live",
    description:
      "Status changes, comments, and assignments sync across the team in real time — so nobody works from a stale list or misses the last note.",
    icon: MessageSquareText,
    visual: <RealtimeVisual />,
  },
  {
    id: "reminders",
    eyebrow: "Step 5 · Follow-ups",
    title: "Never miss a follow-up",
    description:
      "Create reminders on any lead, snooze for 15 minutes, an hour, or a day, and get in-app alerts when it's time to call back.",
    icon: BellRing,
    visual: <NotificationsVisual />,
  },
  {
    id: "filters",
    eyebrow: "Step 6 · Search",
    title: "Filter and find any lead",
    description:
      "Slice by status, source, country, or owner with include / exclude filters — plus search by name, email, or phone.",
    icon: Filter,
    visual: <FiltersVisual />,
  },
  {
    id: "softphone",
    eyebrow: "Step 7 · Calling",
    title: "Call leads with one click",
    description:
      "Dial straight from the lead with Zoiper or MicroSIP, then keep call logs with the rest of the lead history.",
    icon: Phone,
    visual: <SoftphoneVisual />,
  },
  {
    id: "analytics",
    eyebrow: "Step 8 · Insights",
    title: "See your pipeline at a glance",
    description:
      "Dashboard totals for leads, active users, assigned vs unassigned — so admins know where the funnel needs attention.",
    icon: Activity,
    visual: <AnalyticsVisual />,
  },
];

export default function FeaturedCrmSection() {
  const heading = (
    <SectionHeading
      id="featured-heading"
      animate={false}
      eyebrow={<Eyebrow>Inside the CRM</Eyebrow>}
      title="Everything your sales team needs to close"
      subtitle="From first lead to final follow-up — the same tools your team uses every day in the dashboard, shown in one scroll."
    />
  );

  return (
    <section
      id="featured"
      aria-labelledby="featured-heading"
      className="pt-16 pb-0 sm:pt-20"
    >
      <StickyStory steps={STEPS} header={heading} />
    </section>
  );
}
