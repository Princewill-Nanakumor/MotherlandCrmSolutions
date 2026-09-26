/**
 * Escape should clear lead checkbox selection only when no higher-priority
 * UI (details panel, open dialog, open filter menu) owns the key.
 */
export function isLeadSelectionEscapeBlocked(): boolean {
  if (typeof document === "undefined") return true;
  if (document.querySelector("[data-lead-details-panel]")) return true;
  if (
    document.querySelector(
      '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
    )
  ) {
    return true;
  }
  // Portaled FilterSelect / similar menus
  if (document.querySelector('[role="listbox"]')) return true;
  return false;
}
