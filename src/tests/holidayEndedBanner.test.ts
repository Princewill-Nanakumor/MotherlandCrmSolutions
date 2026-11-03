import { describe, expect, it } from "vitest";
import {
  holidayBannerBrandName,
  holidayEndedBannerMessage,
  holidayEndedEmoji,
  holidayEndedFarewell,
} from "@/lib/holidayEffects/holidayEndedBanner";
import type { AppBranding } from "@/lib/appBranding";

const motherland: AppBranding = {
  host: "motherlandcrmsolutions.com",
  origin: "https://motherlandcrmsolutions.com",
  displayName: "Motherland CRM",
  shortName: "Motherland CRM",
  supportEmail: "support@motherlandcrmsolutions.com",
  logoLetter: "M",
};

const vertex: AppBranding = {
  host: "vertexcrmsolution.com",
  origin: "https://vertexcrmsolution.com",
  displayName: "Vertex CRM Solution",
  shortName: "Vertex CRM",
  supportEmail: "support@vertexcrmsolution.com",
  logoLetter: "V",
};

describe("holidayEndedBanner", () => {
  it("uses Motherland / Vertex as the product nickname", () => {
    expect(holidayBannerBrandName(motherland)).toBe("Motherland");
    expect(holidayBannerBrandName(vertex)).toBe("Vertex");
  });

  it("builds Slack-style Halloween copy per brand", () => {
    expect(holidayEndedBannerMessage(motherland, "halloween", "Halloween")).toBe(
      "Your CRM has returned to its normal form. Happy Halloween, from the Motherland Team.",
    );
    expect(holidayEndedBannerMessage(vertex, "halloween", "Halloween")).toBe(
      "Your CRM has returned to its normal form. Happy Halloween, from the Vertex Team.",
    );
  });

  it("picks farewell and emoji per holiday", () => {
    expect(holidayEndedFarewell("christmas", "Christmas")).toBe(
      "Merry Christmas",
    );
    expect(holidayEndedFarewell("new-year", "New Year")).toBe("Happy New Year");
    expect(
      holidayEndedFarewell("womens-day", "International Women's Day"),
    ).toBe("Happy International Women's Day");
    expect(holidayEndedEmoji("halloween")).toBe("🌕");
  });
});
