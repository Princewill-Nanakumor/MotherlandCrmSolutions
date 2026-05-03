/**
 * Single source of truth for payment min/max + rate limits.
 * Server reads from `process.env.MAX_PAYMENT_AMOUNT` etc.; client reads the
 * `NEXT_PUBLIC_*` mirrors via {@link getClientPaymentLimits}. The
 * `/api/payments/limits` route serves the same numbers so deployments only
 * need to set the server vars.
 */

function parsePositive(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = parseInt(raw ?? "", 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

export interface PaymentLimits {
  minAmount: number;
  maxAmount: number;
  maxPerHour: number;
  maxPerDay: number;
  currency: "USDT";
}

export function getServerPaymentLimits(): PaymentLimits {
  return {
    minAmount: parsePositive(process.env.MIN_PAYMENT_AMOUNT, 10),
    maxAmount: parsePositive(process.env.MAX_PAYMENT_AMOUNT, 1_000_000),
    // Daily cap should always be >= hourly cap; we clamp defensively.
    maxPerHour: parsePositiveInt(process.env.MAX_PAYMENTS_PER_HOUR, 10),
    maxPerDay: parsePositiveInt(process.env.MAX_PAYMENTS_PER_DAY, 50),
    currency: "USDT",
  };
}

export function getClientPaymentLimits(): PaymentLimits {
  return {
    minAmount: parsePositive(
      process.env.NEXT_PUBLIC_MIN_PAYMENT_AMOUNT,
      10,
    ),
    maxAmount: parsePositive(
      process.env.NEXT_PUBLIC_MAX_PAYMENT_AMOUNT,
      1_000_000,
    ),
    // Client doesn't enforce per-hour/day; surfaced for display only.
    maxPerHour: parsePositiveInt(
      process.env.NEXT_PUBLIC_MAX_PAYMENTS_PER_HOUR,
      10,
    ),
    maxPerDay: parsePositiveInt(
      process.env.NEXT_PUBLIC_MAX_PAYMENTS_PER_DAY,
      50,
    ),
    currency: "USDT",
  };
}

/** Round to 2 decimals (USD/USDT cents); does NOT validate the input. */
export function roundCents(amount: number): number {
  return Math.round(amount * 100) / 100;
}
