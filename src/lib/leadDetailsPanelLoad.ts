/** Shared dynamic import so admin + agent tables can prefetch the same chunk. */
export function loadLeadDetailsPanel() {
  return import("@/components/dashboardComponents/LeadDetailsPanel");
}
