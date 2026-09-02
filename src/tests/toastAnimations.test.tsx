/**
 * @vitest-environment jsdom
 */
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/ui/toaster";
import { resetToastsForTests, toast } from "@/components/ui/use-toast";

describe("toast animations", () => {
  afterEach(() => {
    cleanup();
    resetToastsForTests();
  });

  it("renders enter class on mount", async () => {
    render(<Toaster />);

    act(() => {
      toast({
        title: "Saved",
        description: "Lead updated",
      });
    });

    const toastNode = await screen.findByText("Lead updated");
    const root = toastNode.closest("[data-state]");

    expect(root).toBeTruthy();
    expect(root).toHaveClass("toast-enter");
    expect(root).not.toHaveClass("toast-exit");
  });

  it("applies exit classes immediately when dismissed", async () => {
    render(<Toaster />);

    let dismissToast: (() => void) | undefined;

    act(() => {
      const result = toast({
        title: "Saved",
        description: "Lead updated",
      });
      dismissToast = result.dismiss;
    });

    const toastNode = await screen.findByText("Lead updated");
    const root = toastNode.closest("[data-state]");

    act(() => {
      dismissToast?.();
    });

    expect(root).toHaveClass("toast-exit");
    expect(root).toHaveClass("toast-exit-right");
    expect(root).not.toHaveClass("toast-enter");
  });

  it("auto dismisses after the configured duration", () => {
    vi.useFakeTimers();

    render(<Toaster />);

    act(() => {
      toast({
        title: "Saved",
        description: "Lead updated",
      });
    });

    expect(screen.getByText("Lead updated")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(4200);
    });

    expect(screen.getByText("Lead updated").closest("[data-state]")).toHaveClass(
      "toast-exit",
    );

    act(() => {
      vi.advanceTimersByTime(480);
    });

    expect(screen.queryByText("Lead updated")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("ignores duplicate dismiss actions", async () => {
    render(<Toaster />);

    let dismissToast: (() => void) | undefined;

    act(() => {
      const result = toast({
        title: "Saved",
        description: "Done",
      });
      dismissToast = result.dismiss;
    });

    await screen.findByText("Done");

    act(() => {
      dismissToast?.();
      dismissToast?.();
    });

    expect(screen.getByText("Done").closest("[data-state]")).toHaveClass(
      "toast-exit",
    );
  });
});
