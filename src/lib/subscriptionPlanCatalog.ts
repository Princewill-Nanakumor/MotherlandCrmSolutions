/**
 * Canonical subscription plans: prices must match `/api/subscription/subscribe`
 * server validation (`amount === plan.price`).
 */
export const SUBSCRIPTION_PLAN_CATALOG = {
  starter: {
    id: "starter",
    name: "Starter",
    price: 10.99,
    maxLeads: 10_000,
    maxUsers: 2,
    description: "Perfect for small businesses getting started",
    /** Homepage + help center copy */
    marketingFeatures: [
      "Up to 10,000 leads",
      "2 team members",
      "CSV/Excel import",
      "Activity logging",
    ],
    /** Dashboard subscription UI */
    subscriptionUiFeatures: [
      "Up to 10,000 leads",
      "2 team members",
      "Activity logging",
    ],
  },
  professional: {
    id: "professional",
    name: "Professional",
    price: 19.99,
    maxLeads: 30_000,
    maxUsers: 5,
    description: "Best for growing businesses",
    marketingFeatures: [
      "Up to 30,000 leads",
      "5 team members",
      "More Team collaboration",
      "Custom fields",
      "Bulk operations",
    ],
    subscriptionUiFeatures: [
      "Up to 30,000 leads",
      "5 team members",
      "Activity logging",
      "More leads imports",
    ],
  },
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    price: 199.99,
    maxLeads: -1,
    maxUsers: -1,
    description: "For large organizations",
    marketingFeatures: [
      "Unlimited leads",
      "Unlimited members",
      "All features included",
      "24/7 dedicated support",
      "Advanced security",
      "Custom workflows",
    ],
    subscriptionUiFeatures: [
      "Unlimited leads",
      "Unlimited team members",
      "Activity logging",
      "More leads imports",
    ],
  },
} as const;

export type SubscriptionPlanCatalogKey = keyof typeof SUBSCRIPTION_PLAN_CATALOG;

export const SUBSCRIPTION_PLAN_ORDER: SubscriptionPlanCatalogKey[] = [
  "starter",
  "professional",
  "enterprise",
];

/**
 * Trial defaults — keep in sync with User schema, signup, usage fallbacks, and UI copy.
 */
export const SUBSCRIPTION_TRIAL_DURATION_DAYS = 3 as const;
export const SUBSCRIPTION_TRIAL_DEFAULT_MAX_LEADS = 50 as const;
export const SUBSCRIPTION_TRIAL_DEFAULT_MAX_USERS = 1 as const;

/** Navbar / plan badge while on trial (e.g. "3 Days Free"). */
export function formatTrialPeriodFreeLabel(days: number): string {
  const n = Math.max(0, Math.floor(days));
  if (n <= 0) return "Trial";
  if (n === 1) return "1 Day Free";
  return `${n} Days Free`;
}

export function formatSubscriptionPriceUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/** Shape used by dashboard subscription components + trial CTA. */
export function toDashboardSubscriptionPlan(key: SubscriptionPlanCatalogKey): {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly";
  features: string[];
  maxLeads: number;
  maxUsers: number;
  isPopular?: boolean;
} {
  const p = SUBSCRIPTION_PLAN_CATALOG[key];
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    billingCycle: "monthly",
    features: [...p.subscriptionUiFeatures],
    maxLeads: p.maxLeads,
    maxUsers: p.maxUsers,
    ...(key === "professional" ? { isPopular: true } : {}),
  };
}
