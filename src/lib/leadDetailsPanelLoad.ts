/** Shared dynamic import so admin + agent tables can prefetch the same chunk. */
export function loadLeadDetailsPanel() {
  // Warm the nested timeline chunk in parallel with the panel shell.
  void import("@/components/leads/leadDetailsPanel/CommentsAndActivities");
  return import("@/components/dashboardComponents/LeadDetailsPanel");
}
