import { describe, expect, it } from "vitest";
import { GET, HEAD } from "./route";

describe("/api/health", () => {
  it("GET returns ok", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ status: "ok" });
  });

  it("HEAD returns ok", async () => {
    const res = await HEAD();
    expect(res.status).toBe(200);
  });
});
