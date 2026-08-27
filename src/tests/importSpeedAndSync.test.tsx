/**
 * @vitest-environment jsdom
 *
 * Import page: client parse speed for 100–2000 leads, plus loading bar /
 * toast / upload-control sync with the import mutation pipeline.
 */
import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { processTextData } from "@/utils/processors";
import FileUploadSection from "@/components/importPageComponents/FileUploadSection";
import { ImportManager } from "@/components/dashboardComponents/ImportManager";

const toastMock = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: {
      user: {
        id: "admin-1",
        role: "ADMIN",
        firstName: "Ada",
        lastName: "Lovelace",
      },
    },
    status: "authenticated",
  }),
}));

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn(), prefetch: vi.fn() }),
}));

const apiCallMock = vi.fn();
vi.mock("@/lib/apiUtils", () => ({
  apiCallWithSessionRefresh: (...args: unknown[]) => apiCallMock(...args),
}));

vi.mock("@/lib/leadFilterQueries", () => ({
  refetchLeadFilterOptions: vi.fn(async () => undefined),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
  toastMock.mockClear();
  apiCallMock.mockClear();
  pushMock.mockClear();
});

beforeAll(() => {
  class ResizeObserverStub {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  vi.stubGlobal("ResizeObserver", ResizeObserverStub);

  // processors → validation logs on every parse; silence in this suite
  vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].startsWith("Validating headers")
    ) {
      return;
    }
  });

  // <style jsx> removed from import UI path; keep act noise quiet in jsdom.
  const originalError = console.error.bind(console);
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    const msg = args.map(String).join(" ");
    if (msg.includes("not configured to support act")) return;
    originalError(...args);
  });
});

const BATCH_SIZES = [100, 200, 300, 500, 750, 1000, 1500, 2000] as const;

/** Loose CI budgets (local parse is ~1–4ms @ 2000; keep headroom). */
function parseBudgetMs(n: number): number {
  return Math.max(150, n * 0.5);
}

function buildCsv(count: number): string {
  const header = "name,email,phone,country";
  const rows = Array.from({ length: count }, (_, i) => {
    const phone = `+1555${String(1000000 + i).padStart(7, "0").slice(0, 7)}`;
    return `Lead${i} User,lead${i}@example.com,${phone},United States`;
  });
  return [header, ...rows].join("\n");
}

function jsonResponse(data: unknown, ok = true, status = ok ? 200 : 400) {
  return {
    ok,
    status,
    json: async () => data,
    headers: new Headers(),
    blob: async () => new Blob(),
  };
}

function stampImportPayload(
  leads: Awaited<ReturnType<typeof processTextData>>,
  importId: string,
) {
  return leads.map((lead) => ({
    ...lead,
    importId,
    source: lead.source || "paste",
  }));
}

describe("import speed (client parse + payload prep)", () => {
  it.each(BATCH_SIZES)(
    "parses %i leads under budget and keeps row count",
    async (n) => {
      const csv = buildCsv(n);
      const start = performance.now();
      const leads = await processTextData(csv);
      const elapsed = performance.now() - start;

      expect(leads).toHaveLength(n);
      expect(leads[0]).toMatchObject({
        firstName: "Lead0",
        email: "lead0@example.com",
      });
      expect(leads[n - 1].email).toBe(`lead${n - 1}@example.com`);
      expect(elapsed).toBeLessThan(parseBudgetMs(n));
    },
  );

  it("prep pipeline (parse → stamp importId → JSON) scales to 2000 under budget", async () => {
    const sizes = [100, 500, 1000, 2000] as const;
    const times: number[] = [];

    for (const n of sizes) {
      const csv = buildCsv(n);
      const start = performance.now();
      const leads = await processTextData(csv);
      const payload = stampImportPayload(leads, "import-bench");
      const body = JSON.stringify(payload);
      const elapsed = performance.now() - start;
      times.push(elapsed);

      expect(payload).toHaveLength(n);
      expect(payload.every((l) => l.importId === "import-bench")).toBe(true);
      expect(body.length).toBeGreaterThan(n * 40);
      expect(elapsed).toBeLessThan(parseBudgetMs(n) * 2);
    }

    // Larger batches should not be dramatically slower than smaller ones
    // on a healthy machine (regression guard against O(n²) parsing).
    expect(times[times.length - 1]).toBeLessThan(500);
  });
});

describe("import loading UI sync (FileUploadSection)", () => {
  const fileInputRef = { current: null as HTMLInputElement | null };

  it("shows indeterminate loading bar and disables upload while importing", () => {
    const { rerender } = render(
      <FileUploadSection
        activeTab="new"
        fileInputRef={fileInputRef}
        isLoading={false}
        error={null}
        successMessage={null}
        handleFileUpload={vi.fn()}
        importHistory={[]}
        onDelete={vi.fn()}
        setShowModal={vi.fn()}
        missingFields={[]}
        usageData={{
          currentLeads: 10,
          maxLeads: 10_000,
          remainingLeads: 9_990,
          canImport: true,
        }}
        usageDataLoading={false}
      />,
    );

    expect(screen.queryByTestId("import-job-progress")).toBeNull();
    expect(screen.getByText(/Click to upload/i)).toBeTruthy();
    expect(document.getElementById("file-upload")).not.toBeDisabled();

    rerender(
      <FileUploadSection
        activeTab="new"
        fileInputRef={fileInputRef}
        isLoading={true}
        error={null}
        successMessage={null}
        handleFileUpload={vi.fn()}
        importHistory={[]}
        onDelete={vi.fn()}
        setShowModal={vi.fn()}
        missingFields={[]}
        usageData={{
          currentLeads: 10,
          maxLeads: 10_000,
          remainingLeads: 9_990,
          canImport: true,
        }}
        usageDataLoading={false}
        importProgress={{
          importId: "abc123456789",
          status: "processing",
          recordCount: 1000,
          processedCount: 400,
          inserted: 380,
          duplicates: 20,
          errors: 0,
          percent: 40,
          chunkIndex: 1,
          chunkTotal: 1,
          startedAt: Date.now(),
          estimatedRemainingMs: 12_000,
        }}
      />,
    );

    expect(screen.getByTestId("import-job-progress")).toBeTruthy();
    expect(screen.getByText(/40%/)).toBeTruthy();
    expect(screen.getByText(/380/)).toBeTruthy();
    expect(screen.getByText(/Import Disabled/i)).toBeTruthy();
    expect(document.getElementById("file-upload")).toBeDisabled();
  });

  it("hides loading UI after import finishes", () => {
    const { rerender } = render(
      <FileUploadSection
        activeTab="new"
        fileInputRef={fileInputRef}
        isLoading={true}
        error={null}
        successMessage={null}
        handleFileUpload={vi.fn()}
        importHistory={[]}
        onDelete={vi.fn()}
        setShowModal={vi.fn()}
        missingFields={[]}
        usageData={{
          currentLeads: 10,
          maxLeads: 10_000,
          remainingLeads: 9_990,
          canImport: true,
        }}
        usageDataLoading={false}
        importProgress={{
          importId: "abc",
          status: "processing",
          recordCount: 100,
          processedCount: 50,
          inserted: 50,
          duplicates: 0,
          errors: 0,
          percent: 50,
          chunkIndex: 1,
          chunkTotal: 1,
          startedAt: Date.now(),
        }}
      />,
    );

    expect(screen.getByTestId("import-job-progress")).toBeTruthy();

    rerender(
      <FileUploadSection
        activeTab="new"
        fileInputRef={fileInputRef}
        isLoading={false}
        error={null}
        successMessage="Successfully imported 100 leads (0 duplicates skipped)"
        handleFileUpload={vi.fn()}
        importHistory={[]}
        onDelete={vi.fn()}
        setShowModal={vi.fn()}
        missingFields={[]}
        usageData={{
          currentLeads: 110,
          maxLeads: 10_000,
          remainingLeads: 9_890,
          canImport: true,
        }}
        usageDataLoading={false}
      />,
    );

    expect(screen.queryByTestId("import-job-progress")).toBeNull();
    expect(document.getElementById("file-upload")).not.toBeDisabled();
  });
});

describe("import page end-to-end sync (loading → API → toast)", () => {
  function renderImportPage() {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    return render(
      <QueryClientProvider client={client}>
        <ImportManager />
      </QueryClientProvider>,
    );
  }

  it("keeps loading visible until process chunk resolves, then toasts success", async () => {
    const user = userEvent.setup();
    const importId = "507f1f77bcf86cd799439011";
    let staged = false;
    let workerPolls = 0;

    apiCallMock.mockImplementation(async (url: unknown, init?: RequestInit) => {
      const path = String(url);
      const method = (init?.method || "GET").toUpperCase();

      if (path.includes("/api/usage")) {
        return jsonResponse({
          currentLeads: 0,
          maxLeads: 10_000,
          remainingLeads: 10_000,
          canImport: true,
        });
      }

      if (path === "/api/imports" && method === "GET") {
        if (!staged) {
          return jsonResponse({ imports: [] });
        }
        workerPolls += 1;
        if (workerPolls < 2) {
          return jsonResponse({
            imports: [
              {
                _id: importId,
                status: "processing",
                recordCount: 100,
                processedCount: 40,
                successCount: 40,
                duplicateCount: 0,
                errorCount: 0,
                nextChunkIndex: 1,
                chunkTotal: 1,
              },
            ],
          });
        }
        return jsonResponse({
          imports: [
            {
              _id: importId,
              status: "completed",
              recordCount: 100,
              processedCount: 100,
              successCount: 100,
              duplicateCount: 0,
              errorCount: 0,
              nextChunkIndex: 1,
              chunkTotal: 1,
            },
          ],
        });
      }

      if (path === "/api/imports" && method === "POST") {
        return jsonResponse({ data: { _id: importId } }, true, 202);
      }

      if (path.includes("/stage") && method === "POST") {
        staged = true;
        return jsonResponse({ staged: true, queued: true }, true, 202);
      }

      if (path === "/api/imports/run" && method === "POST") {
        return jsonResponse({ ok: true, jobsClaimed: 1 });
      }

      return jsonResponse({});
    });

    renderImportPage();

    await waitFor(() => {
      expect(screen.getByText(/Click to upload/i)).toBeTruthy();
    });

    const csv = buildCsv(100);
    const file = new File([csv], "leads-100.csv", { type: "text/csv" });
    const input = document.getElementById("file-upload") as HTMLInputElement;

    await act(async () => {
      await user.upload(input, file);
    });

    await waitFor(() => {
      expect(screen.getByTestId("import-job-progress")).toBeTruthy();
    });
    expect(document.getElementById("file-upload")).toBeDisabled();

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Import Success",
          variant: "success",
          description: expect.stringContaining("Successfully imported 100 leads"),
        }),
      );
    });

    expect(screen.queryByTestId("import-job-progress")).toBeNull();
    expect(document.getElementById("file-upload")).not.toBeDisabled();

    const stageCall = apiCallMock.mock.calls.find(([url]) =>
      String(url).includes("/stage"),
    );
    expect(stageCall).toBeTruthy();
  });

  it("surfaces loading + success toast for a 500-lead file without hanging", async () => {
    const user = userEvent.setup();
    const importId = "507f1f77bcf86cd799439012";

    apiCallMock.mockImplementation(async (url: unknown, init?: RequestInit) => {
      const path = String(url);
      const method = (init?.method || "GET").toUpperCase();

      if (path.includes("/api/usage")) {
        return jsonResponse({
          currentLeads: 0,
          maxLeads: -1,
          remainingLeads: -1,
          canImport: true,
        });
      }
      if (path === "/api/imports" && method === "GET") {
        return jsonResponse({
          imports: [
            {
              _id: importId,
              status: "completed",
              recordCount: 500,
              processedCount: 500,
              successCount: 500,
              duplicateCount: 0,
              errorCount: 0,
              chunkTotal: 1,
              nextChunkIndex: 1,
            },
          ],
        });
      }
      if (path === "/api/imports" && method === "POST") {
        return jsonResponse({ data: { _id: importId } }, true, 202);
      }
      if (path.includes("/stage") && method === "POST") {
        const body = JSON.parse(String(init?.body ?? "{}"));
        expect(body.leads.length).toBeGreaterThan(0);
        return jsonResponse({ staged: true, queued: true }, true, 202);
      }
      if (path === "/api/imports/run" && method === "POST") {
        return jsonResponse({ ok: true });
      }
      return jsonResponse({});
    });

    renderImportPage();
    await waitFor(() => {
      expect(screen.getByText(/Click to upload/i)).toBeTruthy();
    });

    const file = new File([buildCsv(500)], "leads-500.csv", {
      type: "text/csv",
    });
    const input = document.getElementById("file-upload") as HTMLInputElement;

    const start = performance.now();
    await act(async () => {
      await user.upload(input, file);
    });

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Import Success",
          description: expect.stringContaining("500 leads"),
        }),
      );
    });
    const elapsed = performance.now() - start;

    expect(screen.queryByTestId("import-job-progress")).toBeNull();
    expect(elapsed).toBeLessThan(5_000);
  });
});
