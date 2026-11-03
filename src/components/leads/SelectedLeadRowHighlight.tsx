"use client";

import { useSelectedLeadId } from "@/stores/leadsStore";

/**
 * Highlights the open panel's table row via a CSS rule keyed by lead id.
 * Keeps row selection styling out of React so opening/closing the panel does
 * not re-render every mounted table row.
 */
export function SelectedLeadRowHighlight() {
  const selectedLeadId = useSelectedLeadId();
  if (!selectedLeadId) return null;

  const escaped = CSS.escape(selectedLeadId);
  return (
    <style
      // Selection id is from our store (Mongo ObjectId / app id), not user HTML.
      dangerouslySetInnerHTML={{
        __html: `
tr[data-lead-id="${escaped}"] {
  background-color: rgb(249 250 251) !important;
  border-left: 4px solid var(--brand-from) !important;
  border-bottom: 2px solid var(--brand-from) !important;
}
.dark tr[data-lead-id="${escaped}"] {
  background-color: rgb(75 85 99) !important;
}
tr[data-lead-id="${escaped}"] > td {
  color: rgb(17 24 39);
}
.dark tr[data-lead-id="${escaped}"] > td {
  color: rgb(255 255 255);
}
`,
      }}
    />
  );
}
