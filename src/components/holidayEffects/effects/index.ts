import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { HolidayEffectType, HolidayIntensity } from "@/lib/holidayEffects/types";

type HolidayEffectComponent = ComponentType<{ intensity: HolidayIntensity }>;

/**
 * Each holiday is its own async chunk. Only the active effect is downloaded.
 * `dynamic(() => import(...))` must stay inline so Next can split the modules.
 */
export const HOLIDAY_EFFECT_COMPONENTS: Record<
  HolidayEffectType,
  HolidayEffectComponent
> = {
  "valentine-cupid": dynamic(
    () =>
      import("./ValentineEffect").then((m) => ({ default: m.ValentineEffect })),
    { ssr: false },
  ),
  "new-year-confetti": dynamic(
    () =>
      import("./NewYearEffect").then((m) => ({ default: m.NewYearEffect })),
    { ssr: false },
  ),
  "womens-day-petals": dynamic(
    () =>
      import("./WomensDayEffect").then((m) => ({ default: m.WomensDayEffect })),
    { ssr: false },
  ),
  "st-patrick-clovers": dynamic(
    () =>
      import("./StPatrickEffect").then((m) => ({ default: m.StPatrickEffect })),
    { ssr: false },
  ),
  "independence-fireworks": dynamic(
    () =>
      import("./IndependenceEffect").then((m) => ({
        default: m.IndependenceEffect,
      })),
    { ssr: false },
  ),
  "halloween-bats": dynamic(
    () =>
      import("./HalloweenEffect").then((m) => ({ default: m.HalloweenEffect })),
    { ssr: false },
  ),
  "thanksgiving-leaves": dynamic(
    () =>
      import("./ThanksgivingEffect").then((m) => ({
        default: m.ThanksgivingEffect,
      })),
    { ssr: false },
  ),
  "christmas-snow": dynamic(
    () =>
      import("./ChristmasEffect").then((m) => ({ default: m.ChristmasEffect })),
    { ssr: false },
  ),
};
