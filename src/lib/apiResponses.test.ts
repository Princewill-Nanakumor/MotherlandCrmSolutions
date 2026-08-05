import { describe, expect, it } from "vitest";
import { forbiddenResponse, unauthorizedResponse } from "./apiResponses";

describe("apiResponses", () => {
  it("returns 401 unauthorized payload", async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: "Unauthorized",
      code: "UNAUTHORIZED",
      forceLogout: true,
    });
  });

  it("returns 403 forbidden payload", async () => {
    const res = forbiddenResponse("Agents cannot import", "AGENT_FORBIDDEN");
    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toEqual({
      error: "Agents cannot import",
      code: "AGENT_FORBIDDEN",
    });
  });
});
