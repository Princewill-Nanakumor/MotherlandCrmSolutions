/** Shared storage key for homepage terms consent banner. */
export const TERMS_CONSENT_STORAGE_KEY = "motherland-terms-consent-v1";

export type TermsConsentStatus = "accepted" | "dismissed";

export function readTermsConsent(): TermsConsentStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(TERMS_CONSENT_STORAGE_KEY);
    if (value === "accepted" || value === "dismissed") return value;
  } catch {
    /* ignore private-mode / blocked storage */
  }
  return null;
}

export function writeTermsConsent(status: TermsConsentStatus): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TERMS_CONSENT_STORAGE_KEY, status);
  } catch {
    /* ignore */
  }
}
