/**
 * Open tel:/sip:/zoiper:// handlers without navigating the CRM tab away.
 *
 * Do not use a hidden iframe — production CSP is `frame-src 'self'`, so
 * custom-protocol iframe loads are blocked and the dialer never opens.
 * A programmatic <a> click hands the URL to the OS/app handler.
 */
export function openExternalDialerUrl(url: string): void {
  if (typeof document === "undefined") return;
  if (!url) return;

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

/** RFC 3966 tel: URIs keep "+" literal; only strip whitespace. */
export function buildTelUrl(phoneE164: string): string {
  const digits = phoneE164.replace(/\s/g, "");
  return `tel:${digits}`;
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
