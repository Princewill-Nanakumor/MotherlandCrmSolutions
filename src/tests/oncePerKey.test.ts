import { describe, expect, it, vi } from "vitest";
import { runOncePerKey } from "@/lib/oncePerKey";

describe("runOncePerKey", () => {
  it("shares one in-flight promise across concurrent callers", async () => {
    const cache = new Map<string, Promise<void>>();
    let runs = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const work = vi.fn(async () => {
      runs += 1;
      await gate;
    });

    const a = runOncePerKey(cache, "tenant-a", work);
    const b = runOncePerKey(cache, "tenant-a", work);
    expect(work).toHaveBeenCalledTimes(1);
    expect(a).toBe(b);

    release();
    await Promise.all([a, b]);
    expect(runs).toBe(1);

    await runOncePerKey(cache, "tenant-a", work);
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("clears the key on failure so a later call can retry", async () => {
    const cache = new Map<string, Promise<void>>();
    const failing = vi
      .fn()
      .mockRejectedValueOnce(new Error("mongo down"))
      .mockResolvedValueOnce(undefined);

    await expect(runOncePerKey(cache, "tenant-b", failing)).rejects.toThrow(
      "mongo down",
    );
    await expect(runOncePerKey(cache, "tenant-b", failing)).resolves.toBeUndefined();
    expect(failing).toHaveBeenCalledTimes(2);
  });

  it("isolates different keys", async () => {
    const cache = new Map<string, Promise<void>>();
    const workA = vi.fn(async () => undefined);
    const workB = vi.fn(async () => undefined);

    await Promise.all([
      runOncePerKey(cache, "a", workA),
      runOncePerKey(cache, "b", workB),
    ]);

    expect(workA).toHaveBeenCalledTimes(1);
    expect(workB).toHaveBeenCalledTimes(1);
  });
});
