/**
 * Open tel:/sip:/zoiper:// handlers without navigating the CRM tab away.
 * `window.location.assign` / `location.href` can unload the page and look like
 * the browser closed when no handler is registered.
 */
export function openExternalDialerUrl(url: string): void {
  if (typeof document === "undefined") return;

  try {
    const link = document.createElement("a");
    link.href = url;
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      link.remove();
    }, 100);
  } catch (error) {
    console.error("Failed to open dialer URL:", error);
  }
}

export function buildTelUrl(phoneE164: string): string {
  const digits = phoneE164.replace(/\s/g, "");
  return `tel:${encodeURIComponent(digits)}`;
}

export function buildDialerProtocolUrl(
  dialer: "microsip" | "zoiper",
  phoneE164: string,
): string {
  const cleaned = phoneE164.replace(/\s/g, "");
  if (dialer === "microsip") {
    return `sip:${cleaned}`;
  }
  return `zoiper://${cleaned}`;
}
