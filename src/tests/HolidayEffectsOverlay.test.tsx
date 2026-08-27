/**
 * @vitest-environment jsdom
 */
import React, { Suspense, type ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// next/dynamic + ssr:false can stall in jsdom; resolve chunks via React.lazy.
vi.mock("next/dynamic", () => ({
  default:
    (loader: () => Promise<{ default: ComponentType<Record<string, unknown>> }>) => {
      const Lazy = React.lazy(loader);
      function DynamicTestCompat(props: Record<string, unknown>) {
        return (
          <Suspense fallback={null}>
            <Lazy {...props} />
          </Suspense>
        );
      }
      return DynamicTestCompat;
    },
}));

import { HolidayEffectsOverlay } from "@/components/holidayEffects/HolidayEffectsOverlay";
import type { HolidayEffectResolution } from "@/lib/holidayEffects/types";

afterEach(() => {
  cleanup();
});

if (!globalThis.requestAnimationFrame) {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback) =>
    setTimeout(() => cb(Date.now()), 0) as unknown as number;
}

const findEffect = (testId: string) =>
  screen.findByTestId(testId, {}, { timeout: 5_000 });

describe("HolidayEffectsOverlay", () => {
  const valentine: HolidayEffectResolution = {
    ruleId: "valentine",
    effectType: "valentine-cupid",
    intensity: "medium",
  };

  it("renders valentine effect when active", async () => {
    render(
      <HolidayEffectsOverlay resolution={valentine} reducedMotion={false} />,
    );
    expect(await findEffect("holiday-effect-cupid-arrow")).toBeInTheDocument();
  });

  it("renders christmas snow when active", async () => {
    render(
      <HolidayEffectsOverlay
        resolution={{
          ruleId: "christmas",
          effectType: "christmas-snow",
          intensity: "medium",
        }}
        reducedMotion={false}
      />,
    );
    expect(await findEffect("holiday-effect-christmas")).toBeInTheDocument();
  });

  it("renders new year fireworks when active", async () => {
    render(
      <HolidayEffectsOverlay
        resolution={{
          ruleId: "new-year",
          effectType: "new-year-confetti",
          intensity: "high",
        }}
        reducedMotion={false}
      />,
    );
    expect(await findEffect("holiday-effect-new-year")).toBeInTheDocument();
  });

  it("renders halloween bats when active", async () => {
    render(
      <HolidayEffectsOverlay
        resolution={{
          ruleId: "halloween",
          effectType: "halloween-bats",
          intensity: "medium",
        }}
        reducedMotion={false}
      />,
    );
    expect(await findEffect("holiday-effect-halloween")).toBeInTheDocument();
  });

  it("does not render when reducedMotion=true", () => {
    render(<HolidayEffectsOverlay resolution={valentine} reducedMotion />);
    expect(
      screen.queryByTestId("holiday-effect-cupid-arrow"),
    ).not.toBeInTheDocument();
  });

  it("does not render when resolution=null", () => {
    render(
      <HolidayEffectsOverlay resolution={null} reducedMotion={false} />,
    );
    expect(
      screen.queryByTestId("holiday-effect-cupid-arrow"),
    ).not.toBeInTheDocument();
  });
});
