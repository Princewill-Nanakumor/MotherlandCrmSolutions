// src/components/importPageComponents/ImportContent.tsx

import {
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
} from "@/lib/dashboardPageHeading";
import { DASHBOARD_PAGE_HEADER_CLASS } from "@/lib/dashboardPageShell";

export const ImportContent = () => (
  <div className={DASHBOARD_PAGE_HEADER_CLASS}>
    <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Import data</h1>
    <p className={DASHBOARD_PAGE_SUBTITLE_CLASS}>
      Choose how you like to import people, organizations, deals, leads, notes
      and activities.
    </p>
  </div>
);
