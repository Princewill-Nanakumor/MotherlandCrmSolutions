// src/components/homepageComponents/FeatureCardMockups.tsx
"use client";

import type { HomeFeatureVisual } from "@/components/homepageComponents/homepageContent";
import {
  ActivityFeatureMockup,
  ImportFeatureMockup,
  LeadsFeatureMockup,
  LiveFeatureMockup,
  RemindersFeatureMockup,
  TeamFeatureMockup,
} from "@/components/homepageComponents/featureCardMockups/CoreFeatureMockups";
import {
  BillingFeatureMockup,
  BrandFeatureMockup,
  ColumnsFeatureMockup,
  DashboardFeatureMockup,
  FiltersFeatureMockup,
  PhoneFeatureMockup,
} from "@/components/homepageComponents/featureCardMockups/WorkspaceFeatureMockups";

export function FeatureCardMockup({ visual }: { visual: HomeFeatureVisual }) {
  switch (visual) {
    case "leads":
      return <LeadsFeatureMockup />;
    case "import":
      return <ImportFeatureMockup />;
    case "team":
      return <TeamFeatureMockup />;
    case "live":
      return <LiveFeatureMockup />;
    case "reminders":
      return <RemindersFeatureMockup />;
    case "activity":
      return <ActivityFeatureMockup />;
    case "filters":
      return <FiltersFeatureMockup />;
    case "columns":
      return <ColumnsFeatureMockup />;
    case "phone":
      return <PhoneFeatureMockup />;
    case "dashboard":
      return <DashboardFeatureMockup />;
    case "brand":
      return <BrandFeatureMockup />;
    case "billing":
      return <BillingFeatureMockup />;
    default:
      return null;
  }
}
