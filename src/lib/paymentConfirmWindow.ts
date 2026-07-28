/** Window for the depositor to click "I Have Made the Payment". */
export const PAYMENT_CONFIRM_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function getPaymentExpiresAt(from: Date = new Date()): Date {
  return new Date(from.getTime() + PAYMENT_CONFIRM_WINDOW_MS);
}

export function resolvePaymentExpiresAt(payment: {
  expiresAt?: Date | string | null;
  createdAt?: Date | string | null;
}): Date | null {
  if (payment.expiresAt) {
    const deadline = new Date(payment.expiresAt);
    if (!Number.isNaN(deadline.getTime())) return deadline;
  }
  if (payment.createdAt) {
    const created = new Date(payment.createdAt);
    if (!Number.isNaN(created.getTime())) return getPaymentExpiresAt(created);
  }
  return null;
}

export function isPaymentConfirmWindowExpired(
  expiresAt: Date | string | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!expiresAt) return false;
  const deadline = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  if (Number.isNaN(deadline.getTime())) return false;
  return now.getTime() >= deadline.getTime();
}

export function formatCountdown(msRemaining: number): string {
  const clamped = Math.max(0, msRemaining);
  const totalSeconds = Math.floor(clamped / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
