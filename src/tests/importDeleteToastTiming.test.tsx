/**
 * @vitest-environment jsdom
 *
 * Times import-history delete: DELETE API vs success toast. Toast should
 * fire immediately after DELETE; lead/user refetches run in the background.
 */
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, waitFor } from "@testing-library/react";
import {
  QueryClient,
  QueryClientProvider,
  useQuery,
} from "@tanstack/react-query";
import { useImportHistory } from "@/hooks/useImportHistory";

const toastMock = vi.fn();
vi.mock("@/components/ui/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

const apiCallMock = vi.fn();
vi.mock("@/lib/apiUtils", () => ({
  apiCallWithSessionRefresh: (...args: unknown[]) => apiCallMock(...args),
}));

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

type Timeline = {
  marks: Array<{ label: string; at: number }>;
  mark: (label: string) => void;
  since: (label: string) => number | null;
  dump: () => string;
};

function createTimeline(): Timeline {
  const t0 = performance.now();
  const marks: Timeline["marks"] = [];
  return {
    marks,
    mark(label) {
      marks.push({ label, at: performance.now() - t0 });
    },
    since(label) {
      const hit = marks.find((m) => m.label === label);
      if (!hit) return null;
      return performance.now() - t0 - hit.at;
    },
    dump() {
      return marks
        .map((m) => `  ${m.at.toFixed(1)}ms  ${m.label}`)
        .join("\n");
    },
  };
}

const IMPORT_ID = "import-delete-1";

function SeedSlowQueries({
  refetchDelayMs,
  timeline,
}: {
  refetchDelayMs: number;
  timeline: Timeline;
}) {
  // Register inactive queries so onSuccess refetchQueries({ type: "all" })
  // actually awaits network work — matching production with open lead tables.
  useQuery({
    queryKey: ["leads", "seed"],
    queryFn: async () => {
      timeline.mark("refetch:leads:start");
      await delay(refetchDelayMs);
      timeline.mark("refetch:leads:done");
      return [];
    },
  });
  useQuery({
    queryKey: ["assignedLeads", "seed"],
    queryFn: async () => {
      timeline.mark("refetch:assignedLeads:start");
      await delay(refetchDelayMs);
      timeline.mark("refetch:assignedLeads:done");
      return [];
    },
  });
  useQuery({
    queryKey: ["users", "seed"],
    queryFn: async () => {
      timeline.mark("refetch:users:start");
      await delay(refetchDelayMs);
      timeline.mark("refetch:users:done");
      return [];
    },
  });
  useQuery({
    queryKey: ["leads-stats", "seed"],
    queryFn: async () => {
      timeline.mark("refetch:leads-stats:start");
      await delay(refetchDelayMs);
      timeline.mark("refetch:leads-stats:done");
      return {};
    },
  });
  useQuery({
    queryKey: ["import-usage-data"],
    queryFn: async () => {
      timeline.mark("refetch:import-usage-data:start");
      await delay(40);
      timeline.mark("refetch:import-usage-data:done");
      return { currentLeads: 0 };
    },
  });
  useQuery({
    queryKey: ["import-history"],
    queryFn: async () => {
      timeline.mark("refetch:import-history:start");
      await delay(40);
      timeline.mark("refetch:import-history:done");
      return [
        {
          _id: IMPORT_ID,
          fileName: "leads.xlsx",
          timestamp: Date.now(),
          uploadedBy: "admin-1",
          recordCount: 3,
          status: "completed",
          successCount: 3,
          failureCount: 0,
        },
      ];
    },
  });
  return null;
}

function DeleteProbe({
  onReady,
}: {
  onReady: (api: {
    deleteImport: (id: string) => Promise<unknown>;
    isDeleting: boolean;
  }) => void;
}) {
  const { deleteImport, isDeleting } = useImportHistory();
  React.useEffect(() => {
    onReady({ deleteImport, isDeleting });
  }, [deleteImport, isDeleting, onReady]);
  return null;
}

afterEach(() => {
  cleanup();
  toastMock.mockClear();
  apiCallMock.mockClear();
});

describe("import history delete → toast timing", () => {
  it("toasts right after DELETE even when lead/user refetches are slow", async () => {
    const timeline = createTimeline();
    const DELETE_MS = 80;
    const REFETCH_MS = 250;

    apiCallMock.mockImplementation(async (url: unknown, init?: RequestInit) => {
      const path = String(url);
      const method = (init?.method || "GET").toUpperCase();

      if (path.startsWith("/api/imports?id=") && method === "DELETE") {
        timeline.mark("delete:api:start");
        await delay(DELETE_MS);
        timeline.mark("delete:api:done");
        return jsonResponse({
          message: "Import and associated leads deleted",
          deletedLeads: 3,
        });
      }

      if (path === "/api/imports" && method === "GET") {
        return jsonResponse({
          imports: [
            {
              _id: IMPORT_ID,
              fileName: "leads.xlsx",
              timestamp: Date.now(),
              uploadedBy: "admin-1",
              recordCount: 3,
              status: "completed",
              successCount: 3,
              failureCount: 0,
            },
          ],
        });
      }

      return jsonResponse({});
    });

    toastMock.mockImplementation((args: unknown) => {
      timeline.mark("toast:success");
      return args;
    });

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    let api: {
      deleteImport: (id: string) => Promise<unknown>;
      isDeleting: boolean;
    } | null = null;

    render(
      <QueryClientProvider client={client}>
        <SeedSlowQueries refetchDelayMs={REFETCH_MS} timeline={timeline} />
        <DeleteProbe
          onReady={(next) => {
            api = next;
          }}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(api).not.toBeNull());

    // Let seeded queries settle once before delete so onSuccess refetches
    // are the ones we measure (not the initial mount fetches).
    await waitFor(() => {
      expect(
        timeline.marks.some((m) => m.label === "refetch:leads:done"),
      ).toBe(true);
    });

    timeline.mark("delete:mutate:start");
    const deletePromise = api!.deleteImport(IMPORT_ID);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalled();
    });
    timeline.mark("delete:mutate:resolved-wait");

    const deleteDone = timeline.marks.find((m) => m.label === "delete:api:done")!;
    const toastAt = timeline.marks.find((m) => m.label === "toast:success")!;
    const gapMs = toastAt.at - deleteDone.at;

    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        "── import delete timing ──",
        timeline.dump(),
        `gap (toast − delete:api:done) = ${gapMs.toFixed(1)}ms`,
        "───────────────────────────",
        "",
      ].join("\n"),
    );

    // Toast must follow DELETE closely — not wait on ~REFETCH_MS table refetches.
    expect(gapMs).toBeLessThan(100);
    expect(toastAt.at).toBeGreaterThanOrEqual(deleteDone.at - 1);

    // Background refetches may still be in flight when toast fires.
    const refetchStillPending = !timeline.marks.some(
      (m) =>
        m.label === "refetch:leads:done" && m.at > deleteDone.at + 50,
    );
    // Either still pending or finished after toast — toast must not wait for them.
    void refetchStillPending;

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Success",
        variant: "success",
      }),
    );

    await deletePromise;
  });

  it("shows the toast almost immediately when no lead/user queries need refetch", async () => {
    const timeline = createTimeline();
    const DELETE_MS = 50;

    apiCallMock.mockImplementation(async (url: unknown, init?: RequestInit) => {
      const path = String(url);
      const method = (init?.method || "GET").toUpperCase();

      if (path.startsWith("/api/imports?id=") && method === "DELETE") {
        timeline.mark("delete:api:start");
        await delay(DELETE_MS);
        timeline.mark("delete:api:done");
        return jsonResponse({
          message: "Import and associated leads deleted",
          deletedLeads: 1,
        });
      }

      if (path === "/api/imports" && method === "GET") {
        return jsonResponse({ imports: [] });
      }

      return jsonResponse({});
    });

    toastMock.mockImplementation(() => {
      timeline.mark("toast:success");
    });

    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    let api: {
      deleteImport: (id: string) => Promise<unknown>;
    } | null = null;

    // No SeedSlowQueries — refetchQueries finds nothing heavy to wait on.
    render(
      <QueryClientProvider client={client}>
        <DeleteProbe
          onReady={(next) => {
            api = next;
          }}
        />
      </QueryClientProvider>,
    );

    await waitFor(() => expect(api).not.toBeNull());

    timeline.mark("delete:mutate:start");
    await api!.deleteImport(IMPORT_ID);

    await waitFor(() => expect(toastMock).toHaveBeenCalled());

    const deleteDone = timeline.marks.find((m) => m.label === "delete:api:done")!;
    const toastAt = timeline.marks.find((m) => m.label === "toast:success")!;
    const gapMs = toastAt.at - deleteDone.at;

    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        "── import delete timing (no seeded refetches) ──",
        timeline.dump(),
        `gap (toast − delete:api:done) = ${gapMs.toFixed(1)}ms`,
        "────────────────────────────────────────────────",
        "",
      ].join("\n"),
    );

    // Without registered lead/user queries, toast should follow DELETE closely.
    expect(gapMs).toBeLessThan(200);
  });
});
