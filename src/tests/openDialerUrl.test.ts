/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDialerProtocolUrl,
  buildTelUrl,
  openExternalDialerUrl,
} from "@/lib/openDialerUrl";

describe("openDialerUrl helpers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("builds tel URLs without spaces and keeps + literal", () => {
    expect(buildTelUrl("+1 819 962 5286")).toBe("tel:+18199625286");
  });

  it("builds microsip sip URLs", () => {
    expect(buildDialerProtocolUrl("microsip", "+491701234567")).toBe(
      "sip:+491701234567",
    );
  });

  it("builds zoiper URLs", () => {
    expect(buildDialerProtocolUrl("zoiper", "+491701234567")).toBe(
      "zoiper://+491701234567",
    );
  });

  it("opens dialer links in a new browsing context so Opera Mini keeps the CRM tab", () => {
    const click = vi.fn();
    const appendSpy = vi.spyOn(document.body, "appendChild");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(click);

    openExternalDialerUrl("tel:+15551234567");

    expect(appendSpy).toHaveBeenCalled();
    const link = appendSpy.mock.calls[0]?.[0] as HTMLAnchorElement;
    expect(link).toBeInstanceOf(HTMLAnchorElement);
    expect(link.href).toContain("tel:+15551234567");
    expect(link.target).toBe("_blank");
    expect(link.rel).toContain("noopener");
    expect(click).toHaveBeenCalledTimes(1);
  });
});
