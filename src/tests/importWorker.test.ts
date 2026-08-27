import { beforeEach, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";

const publishAdminLeadsUpdatedEvent = vi.fn().mockResolvedValue(undefined);
const bulkUpsertImportChunk = vi.fn();

vi.mock("@/libs/ablyServer", () => ({
  publishAdminLeadsUpdatedEvent: (...args: unknown[]) =>
    publishAdminLeadsUpdatedEvent(...args),
}));

vi.mock("@/lib/importChunkBulk", () => ({
  bulkUpsertImportChunk: (...args: unknown[]) => bulkUpsertImportChunk(...args),
}));

const importStore: Record<string, Record<string, unknown>> = {};
const stagingStore: Array<Record<string, unknown>> = [];

function oid(id?: string) {
  return id ? new mongoose.Types.ObjectId(id) : new mongoose.Types.ObjectId();
}

vi.mock("@/models/Import", () => {
  const leaseMs = Math.max(
    2 * 60 * 1000,
    Number(process.env.IMPORT_WORKER_LEASE_MS || 10 * 60 * 1000),
  );

  function isLeaseHeld(d: Record<string, unknown>) {
    const claimedAt = d.workerClaimedAt
      ? new Date(String(d.workerClaimedAt)).getTime()
      : 0;
    return Boolean(d.workerClaimId) && claimedAt > Date.now() - leaseMs;
  }

  const api = {
    distinct: vi.fn(async (field: string, filter: Record<string, unknown>) => {
      const out = new Set<string>();
      for (const d of Object.values(importStore)) {
        if (filter.status && d.status !== filter.status) continue;
        if (
          filter.workerClaimedAt &&
          typeof filter.workerClaimedAt === "object" &&
          "$gt" in (filter.workerClaimedAt as object)
        ) {
          const gt = new Date(
            String((filter.workerClaimedAt as { $gt: Date }).$gt),
          ).getTime();
          const claimedAt = d.workerClaimedAt
            ? new Date(String(d.workerClaimedAt)).getTime()
            : 0;
          if (!(claimedAt > gt)) continue;
        }
        if (filter.workerClaimId && "$nin" in (filter.workerClaimId as object)) {
          const nin = (filter.workerClaimId as { $nin: unknown[] }).$nin;
          if (nin.includes(d.workerClaimId) || d.workerClaimId == null) continue;
        }
        out.add(String(d[field]));
      }
      return [...out];
    }),
    findOneAndUpdate: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>, opts?: { new?: boolean }) => {
      const list = Object.values(importStore);
      const doc = list.find((d) => {
        if (filter._id && String(d._id) !== String(filter._id)) return false;
        if (filter.workerClaimId && d.workerClaimId !== filter.workerClaimId) return false;
        if (
          filter.nextChunkIndex !== undefined &&
          Number(d.nextChunkIndex) !== Number(filter.nextChunkIndex)
        ) {
          return false;
        }
        if (filter.status === "processing" && d.status !== "processing") return false;
        if (
          filter.status &&
          typeof filter.status === "object" &&
          "$in" in (filter.status as object)
        ) {
          const allowed = (filter.status as { $in: string[] }).$in;
          if (!allowed.includes(String(d.status))) return false;
        }
        return true;
      });
      // claim path: no _id — mirror worker $or + same-tenant busy filter
      if (!filter._id) {
        const or = (filter.$or as Array<Record<string, unknown>>) || [];
        const sorted = [...list].sort(
          (a, b) =>
            new Date(String(a.createdAt || 0)).getTime() -
            new Date(String(b.createdAt || 0)).getTime(),
        );
        const candidate = sorted.find((d) => {
          for (const branch of or) {
            if (branch.status === "processing") {
              if (d.status !== "processing") continue;
              if (isLeaseHeld(d)) continue;
              return true;
            }
            if (branch.status === "queued") {
              if (d.status !== "queued") continue;
              const nin = (branch.adminId as { $nin?: unknown[] } | undefined)
                ?.$nin;
              if (
                nin &&
                nin.some((id) => String(id) === String(d.adminId))
              ) {
                continue;
              }
              return true;
            }
          }
          // legacy fallback
          if (!or.length) {
            if (!["queued", "processing"].includes(String(d.status))) return false;
            return !isLeaseHeld(d);
          }
          return false;
        });
        if (!candidate) return null;
        const set = (update.$set || {}) as Record<string, unknown>;
        Object.assign(candidate, set);
        return opts?.new === false ? null : { ...candidate, toObject: () => candidate };
      }
      if (!doc) return null;
      if (update.$inc) {
        for (const [k, v] of Object.entries(update.$inc as Record<string, number>)) {
          doc[k] = Number(doc[k] || 0) + v;
        }
      }
      if (update.$set) Object.assign(doc, update.$set);
      return opts?.new === false ? null : { ...doc, toObject: () => doc };
    }),
    findById: vi.fn((id: unknown) => ({
      select: () => ({
        lean: async () => importStore[String(id)] || null,
      }),
    })),
    updateOne: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const doc = importStore[String(filter._id)];
      if (!doc) return { matchedCount: 0 };
      if (filter.workerClaimId && doc.workerClaimId !== filter.workerClaimId) {
        return { matchedCount: 0 };
      }
      if (update.$set) Object.assign(doc, update.$set);
      return { matchedCount: 1 };
    }),
    findOne: vi.fn(async (filter: Record<string, unknown>) => {
      return (
        Object.values(importStore).find((d) => {
          if (filter._id && String(d._id) !== String(filter._id)) return false;
          if (filter.workerClaimId && d.workerClaimId !== filter.workerClaimId)
            return false;
          if (filter.status && d.status !== filter.status) return false;
          return true;
        }) || null
      );
    }),
  };
  return { default: api };
});

vi.mock("@/models/ImportStagingChunk", () => {
  const api = {
    findOneAndUpdate: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>, opts?: { new?: boolean }) => {
      const chunk = stagingStore.find(
        (c) =>
          String(c.importId) === String(filter.importId) &&
          c.chunkIndex === filter.chunkIndex &&
          c.processed === filter.processed,
      );
      if (!chunk) return null;
      if (update.$set) Object.assign(chunk, update.$set);
      return opts?.new === false ? null : chunk;
    }),
    updateOne: vi.fn(async (filter: Record<string, unknown>, update: Record<string, unknown>) => {
      const chunk = stagingStore.find((c) => String(c._id) === String(filter._id));
      if (chunk && update.$set) Object.assign(chunk, update.$set);
      return { matchedCount: chunk ? 1 : 0 };
    }),
    countDocuments: vi.fn(async (filter: Record<string, unknown>) => {
      return stagingStore.filter((c) => {
        if (filter.importId && String(c.importId) !== String(filter.importId)) {
          return false;
        }
        if (
          filter.processed !== undefined &&
          c.processed !== filter.processed
        ) {
          return false;
        }
        return true;
      }).length;
    }),
    findOne: vi.fn((filter: Record<string, unknown>) => {
      const matches = stagingStore.filter((c) => {
        if (filter.importId && String(c.importId) !== String(filter.importId)) {
          return false;
        }
        if (
          filter.processed !== undefined &&
          c.processed !== filter.processed
        ) {
          return false;
        }
        return true;
      });
      return {
        sort: () => ({
          select: () => ({
            lean: async () => {
              if (matches.length === 0) return null;
              return [...matches].sort(
                (a, b) => Number(a.chunkIndex) - Number(b.chunkIndex),
              )[0];
            },
          }),
        }),
      };
    }),
    deleteMany: vi.fn(async (filter?: Record<string, unknown>) => {
      if (!filter?.importId) {
        const n = stagingStore.length;
        stagingStore.length = 0;
        return { deletedCount: n };
      }
      const before = stagingStore.length;
      for (let i = stagingStore.length - 1; i >= 0; i--) {
        if (String(stagingStore[i].importId) === String(filter.importId)) {
          stagingStore.splice(i, 1);
        }
      }
      return { deletedCount: before - stagingStore.length };
    }),
  };
  return { default: api };
});

vi.mock("mongoose", async () => {
  const actual = await vi.importActual<typeof import("mongoose")>("mongoose");
  return {
    ...actual,
    default: {
      ...actual.default,
      connection: { db: {} },
    },
  };
});

describe("importWorker", () => {
  beforeEach(() => {
    for (const k of Object.keys(importStore)) delete importStore[k];
    stagingStore.length = 0;
    publishAdminLeadsUpdatedEvent.mockClear();
    bulkUpsertImportChunk.mockReset();
    bulkUpsertImportChunk.mockResolvedValue({
      inserted: 2,
      duplicates: 0,
      errors: 0,
      invalidRows: 0,
    });
  });

  it("processes staged chunks, completes job, publishes progress", async () => {
    const importId = oid();
    const adminId = oid();
    importStore[String(importId)] = {
      _id: importId,
      adminId,
      uploadedBy: adminId,
      status: "queued",
      recordCount: 4,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 2,
      workerClaimedAt: null,
      workerClaimId: null,
    };
    stagingStore.push(
      {
        _id: oid(),
        importId,
        chunkIndex: 0,
        processed: false,
        leads: [{ email: "a@x.com" }, { email: "b@x.com" }],
      },
      {
        _id: oid(),
        importId,
        chunkIndex: 1,
        processed: false,
        leads: [{ email: "c@x.com" }, { email: "d@x.com" }],
      },
    );

    const { runImportWorkerTick } = await import("@/lib/importWorker");
    // Multiple ticks until done (worker releases lease between batches)
    for (let i = 0; i < 5; i++) {
      await runImportWorkerTick();
      if (importStore[String(importId)].status === "completed") break;
    }

    expect(importStore[String(importId)].status).toBe("completed");
    expect(Number(importStore[String(importId)].successCount)).toBeGreaterThan(0);
    expect(publishAdminLeadsUpdatedEvent).toHaveBeenCalledWith(
      String(adminId),
      expect.objectContaining({ type: "import_progress" }),
    );
  });

  it("marks failed and keeps cursor for resume when bulkWrite throws", async () => {
    const importId = oid();
    const adminId = oid();
    importStore[String(importId)] = {
      _id: importId,
      adminId,
      uploadedBy: adminId,
      status: "queued",
      recordCount: 2,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 1,
      workerClaimedAt: null,
      workerClaimId: null,
    };
    stagingStore.push({
      _id: oid(),
      importId,
      chunkIndex: 0,
      processed: false,
      leads: [{ email: "a@x.com" }, { email: "b@x.com" }],
    });
    bulkUpsertImportChunk.mockRejectedValueOnce(new Error("simulated DB down"));

    const { runImportWorkerTick, resumeImportJob } = await import(
      "@/lib/importWorker"
    );
    await runImportWorkerTick();

    expect(importStore[String(importId)].status).toBe("failed");
    expect(importStore[String(importId)].nextChunkIndex).toBe(0);
    expect(stagingStore[0].processed).toBe(false);

    bulkUpsertImportChunk.mockResolvedValue({
      inserted: 2,
      duplicates: 0,
      errors: 0,
      invalidRows: 0,
    });
    const resumed = await resumeImportJob(String(importId), adminId);
    expect(resumed.ok).toBe(true);
    expect(importStore[String(importId)].status).toBe("queued");

    for (let i = 0; i < 5; i++) {
      await runImportWorkerTick();
      if (importStore[String(importId)].status === "completed") break;
    }
    expect(importStore[String(importId)].status).toBe("completed");
  });

  it("exclusive claim: concurrent ticks do not double-process the same chunks", async () => {
    const importId = oid();
    const adminId = oid();
    importStore[String(importId)] = {
      _id: importId,
      adminId,
      uploadedBy: adminId,
      status: "queued",
      recordCount: 4,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 4,
      workerClaimedAt: null,
      workerClaimId: null,
    };
    for (let i = 0; i < 4; i++) {
      stagingStore.push({
        _id: oid(),
        importId,
        chunkIndex: i,
        processed: false,
        leads: [{ email: `c${i}@x.com` }],
      });
    }

    let inFlight = 0;
    let maxInFlight = 0;
    bulkUpsertImportChunk.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((r) => setTimeout(r, 20));
      inFlight -= 1;
      return { inserted: 1, duplicates: 0, errors: 0, invalidRows: 0 };
    });

    const { runImportWorkerTick } = await import("@/lib/importWorker");
    await Promise.all([runImportWorkerTick(), runImportWorkerTick()]);

    for (let i = 0; i < 10; i++) {
      if (importStore[String(importId)].status === "completed") break;
      await runImportWorkerTick();
    }

    expect(importStore[String(importId)].status).toBe("completed");
    expect(bulkUpsertImportChunk).toHaveBeenCalledTimes(4);
    // Lease + claimId: at most one worker processes a job at a time
    expect(maxInFlight).toBe(1);
  });

  it("does not mark completed when cursor chunk is already processed but more remain", async () => {
    const importId = oid();
    const adminId = oid();
    importStore[String(importId)] = {
      _id: importId,
      adminId,
      uploadedBy: adminId,
      status: "queued",
      recordCount: 4,
      processedCount: 2,
      successCount: 2,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 2,
      workerClaimedAt: null,
      workerClaimId: null,
    };
    stagingStore.push(
      {
        _id: oid(),
        importId,
        chunkIndex: 0,
        processed: true,
        leads: [{ email: "a@x.com" }],
      },
      {
        _id: oid(),
        importId,
        chunkIndex: 1,
        processed: false,
        leads: [{ email: "b@x.com" }],
      },
    );

    const { runImportWorkerTick } = await import("@/lib/importWorker");
    await runImportWorkerTick();

    // Should recover by jumping cursor to chunk 1 and processing it
    expect(importStore[String(importId)].status).toBe("completed");
    expect(bulkUpsertImportChunk).toHaveBeenCalledTimes(1);
    expect(Number(importStore[String(importId)].nextChunkIndex)).toBe(2);
  });

  it("same tenant: second import stays queued while first is processing", async () => {
    const adminId = oid();
    const firstId = oid();
    const secondId = oid();
    const t0 = Date.now();
    importStore[String(firstId)] = {
      _id: firstId,
      adminId,
      uploadedBy: adminId,
      status: "queued",
      recordCount: 2,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 1,
      workerClaimedAt: null,
      workerClaimId: null,
      createdAt: new Date(t0),
    };
    importStore[String(secondId)] = {
      _id: secondId,
      adminId,
      uploadedBy: adminId,
      status: "queued",
      recordCount: 2,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 1,
      workerClaimedAt: null,
      workerClaimId: null,
      createdAt: new Date(t0 + 1000),
    };
    stagingStore.push(
      {
        _id: oid(),
        importId: firstId,
        chunkIndex: 0,
        processed: false,
        leads: [{ email: "first@x.com" }],
      },
      {
        _id: oid(),
        importId: secondId,
        chunkIndex: 0,
        processed: false,
        leads: [{ email: "second@x.com" }],
      },
    );

    let releaseFirst!: () => void;
    const gate = new Promise<void>((r) => {
      releaseFirst = r;
    });
    bulkUpsertImportChunk.mockImplementation(async () => {
      await gate;
      return { inserted: 1, duplicates: 0, errors: 0, invalidRows: 0 };
    });

    const { runImportWorkerTick } = await import("@/lib/importWorker");
    const tick1 = runImportWorkerTick();
    // Let claim happen
    await new Promise((r) => setTimeout(r, 30));

    expect(importStore[String(firstId)].status).toBe("processing");
    expect(importStore[String(secondId)].status).toBe("queued");

    // Another tick must not steal the second same-tenant job
    await runImportWorkerTick();
    expect(importStore[String(secondId)].status).toBe("queued");

    releaseFirst();
    await tick1;

    // Finish both
    for (let i = 0; i < 8; i++) {
      await runImportWorkerTick();
      if (
        importStore[String(firstId)].status === "completed" &&
        importStore[String(secondId)].status === "completed"
      ) {
        break;
      }
    }
    expect(importStore[String(firstId)].status).toBe("completed");
    expect(importStore[String(secondId)].status).toBe("completed");
  });

  it("different tenants can process concurrently", async () => {
    const adminA = oid();
    const adminB = oid();
    const idA = oid();
    const idB = oid();
    importStore[String(idA)] = {
      _id: idA,
      adminId: adminA,
      uploadedBy: adminA,
      status: "queued",
      recordCount: 1,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 1,
      workerClaimedAt: null,
      workerClaimId: null,
      createdAt: new Date(),
    };
    importStore[String(idB)] = {
      _id: idB,
      adminId: adminB,
      uploadedBy: adminB,
      status: "queued",
      recordCount: 1,
      processedCount: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errorCount: 0,
      nextChunkIndex: 0,
      chunkTotal: 1,
      workerClaimedAt: null,
      workerClaimId: null,
      createdAt: new Date(),
    };
    stagingStore.push(
      {
        _id: oid(),
        importId: idA,
        chunkIndex: 0,
        processed: false,
        leads: [{ email: "a@x.com" }],
      },
      {
        _id: oid(),
        importId: idB,
        chunkIndex: 0,
        processed: false,
        leads: [{ email: "b@x.com" }],
      },
    );

    let inFlight = 0;
    let maxInFlight = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => {
      release = r;
    });
    bulkUpsertImportChunk.mockImplementation(async () => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await gate;
      inFlight -= 1;
      return { inserted: 1, duplicates: 0, errors: 0, invalidRows: 0 };
    });

    const { runImportWorkerTick } = await import("@/lib/importWorker");
    const p = Promise.all([runImportWorkerTick(), runImportWorkerTick()]);
    await new Promise((r) => setTimeout(r, 40));
    expect(maxInFlight).toBe(2);
    release();
    await p;
    expect(importStore[String(idA)].status).toBe("completed");
    expect(importStore[String(idB)].status).toBe("completed");
  });
});
