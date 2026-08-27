/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportHistory } from "@/components/importPageComponents/ImportHistory";
import type { ImportHistoryItem } from "@/types/import";

afterEach(() => {
  cleanup();
});

const sampleImport: ImportHistoryItem = {
  _id: "import-1",
  fileName: "march-leads.xlsx",
  timestamp: Date.now(),
  uploadedBy: "admin-1",
  recordCount: 10,
  status: "completed",
  successCount: 9,
  failureCount: 1,
};

describe("ImportHistory", () => {
  it("opens delete confirmation modal and confirms delete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<ImportHistory imports={[sampleImport]} onDelete={onDelete} />);

    expect(screen.getByText("march-leads.xlsx")).toBeInTheDocument();

    await user.click(screen.getByTitle("Delete import"));

    const dialog = await screen.findByRole("alertdialog");
    expect(
      within(dialog).getByText("Delete this import?"),
    ).toBeInTheDocument();
    expect(within(dialog).getByText("march-leads.xlsx")).toBeInTheDocument();

    await user.click(
      within(dialog).getByRole("button", { name: "Delete import" }),
    );

    expect(onDelete).toHaveBeenCalledWith("import-1");
  });

  it("cancels delete without calling onDelete", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<ImportHistory imports={[sampleImport]} onDelete={onDelete} />);

    await user.click(screen.getByTitle("Delete import"));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
