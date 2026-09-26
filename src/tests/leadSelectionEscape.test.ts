import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { isLeadSelectionEscapeBlocked } from "@/lib/leadSelectionEscape";

describe("isLeadSelectionEscapeBlocked", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("allows Escape when no overlays are open", () => {
    expect(isLeadSelectionEscapeBlocked()).toBe(false);
  });

  it("blocks Escape when the lead details panel is open", () => {
    const el = document.createElement("div");
    el.setAttribute("data-lead-details-panel", "");
    document.body.appendChild(el);
    expect(isLeadSelectionEscapeBlocked()).toBe(true);
  });

  it("blocks Escape for open dialogs only", () => {
    const closed = document.createElement("div");
    closed.setAttribute("role", "dialog");
    closed.setAttribute("data-state", "closed");
    document.body.appendChild(closed);
    expect(isLeadSelectionEscapeBlocked()).toBe(false);

    const open = document.createElement("div");
    open.setAttribute("role", "alertdialog");
    open.setAttribute("data-state", "open");
    document.body.appendChild(open);
    expect(isLeadSelectionEscapeBlocked()).toBe(true);
  });
});
