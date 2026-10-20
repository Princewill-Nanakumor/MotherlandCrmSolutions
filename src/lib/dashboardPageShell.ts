/** Shared dashboard page shell so every route uses the same padding/border. */
export const DASHBOARD_PAGE_SHELL_CLASS =
  "w-full min-w-0 max-w-full overflow-x-hidden rounded-lg border bg-background p-4 dark:bg-gray-800 sm:p-6";

/** Bottom gap under the page title + subtitle block. */
export const DASHBOARD_PAGE_HEADER_CLASS = "mb-6 sm:mb-8";

/**
 * Full-height list pages (all-leads / my-leads) keep scroll ownership
 * but match the same border/radius/background as standard shells.
 */
export const DASHBOARD_PAGE_SHELL_FILL_CLASS =
  "flex h-full min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto rounded-lg border bg-background dark:bg-gray-800";

/** Horizontal + top padding for leads header bands (matches shell p-4 sm:p-6). */
export const DASHBOARD_PAGE_INSET_HEADER_CLASS =
  "bg-white px-4 pt-6 sm:px-6 dark:bg-gray-800 dark:border-gray-700";

/** Horizontal + bottom padding for leads body content. */
export const DASHBOARD_PAGE_INSET_BODY_CLASS = "px-4 pb-4 sm:px-6";
