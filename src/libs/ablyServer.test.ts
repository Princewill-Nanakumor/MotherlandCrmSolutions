import { describe, expect, it, vi, beforeEach } from "vitest";

const publish = vi.fn().mockResolvedValue(undefined);
const getChannel = vi.fn(() => ({ publish }));

vi.mock("ably", () => {
  class Rest {
    channels = { get: getChannel };
    constructor(_key: string) {}
  }
  return { default: { Rest } };
});

describe("ablyServer publishers", () => {
  beforeEach(() => {
    vi.resetModules();
    publish.mockClear();
    getChannel.mockClear();
    process.env.ABLY_API_KEY = "test-key:secret";
  });

  it("no-ops when ABLY_API_KEY is missing", async () => {
    delete process.env.ABLY_API_KEY;
    const { publishAdminLeadsUpdatedEvent } = await import("./ablyServer");
    await publishAdminLeadsUpdatedEvent("admin1", { type: "ping" });
    expect(getChannel).not.toHaveBeenCalled();
  });

  it("publishes admin leads updated event on tenant channel", async () => {
    const { publishAdminLeadsUpdatedEvent } = await import("./ablyServer");
    await publishAdminLeadsUpdatedEvent("admin1", {
      type: "status_changed",
      leadId: "lead1",
    });

    expect(getChannel).toHaveBeenCalledWith("crm:admin:admin1:leads");
    expect(publish).toHaveBeenCalledWith("admin.leads.updated", {
      type: "status_changed",
      leadId: "lead1",
    });
  });

  it("publishes lead updated event on lead channel", async () => {
    const { publishLeadUpdatedEvent } = await import("./ablyServer");
    await publishLeadUpdatedEvent("admin1", "lead9", { type: "status_changed" });

    expect(getChannel).toHaveBeenCalledWith("crm:admin:admin1:lead:lead9");
    expect(publish).toHaveBeenCalledWith("lead.updated", {
      type: "status_changed",
    });
  });
});
