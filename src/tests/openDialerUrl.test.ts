import { describe, expect, it } from "vitest";
import {
  buildDialerProtocolUrl,
  buildTelUrl,
} from "@/lib/openDialerUrl";

describe("openDialerUrl helpers", () => {
  it("builds tel URLs without spaces", () => {
    expect(buildTelUrl("+1 819 962 5286")).toBe(
      "tel:%2B18199625286",
    );
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
});
