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
    const { publishAdminLeadsUpdatedEvent } = await import("@/libs/ablyServer");
    await publishAdminLeadsUpdatedEvent("admin1", { type: "ping" });
    expect(getChannel).not.toHaveBeenCalled();
  });

  it("publishes admin leads updated event on tenant channel", async () => {
    const { publishAdminLeadsUpdatedEvent } = await import("@/libs/ablyServer");
    await publishAdminLeadsUpdatedEvent("admin1", {
      type: "status_changed",
      leadId: "lead1",
    });

    expect(getChannel).toHaveBeenCalledWith("crm:tenant:admin1");
    expect(publish).toHaveBeenCalledWith("admin.leads.updated", {
      type: "status_changed",
      leadId: "lead1",
    });
  });

  it("publishLeadUpdatedEvent is a no-op (avoids double-publish with admin event)", async () => {
    const { publishLeadUpdatedEvent } = await import("@/libs/ablyServer");
    await publishLeadUpdatedEvent("admin1", "lead9", { type: "status_changed" });

    expect(getChannel).not.toHaveBeenCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it("publishes reminders on the tenant channel with lean ids only", async () => {
    const { publishReminderDueEvent } = await import("@/libs/ablyServer");
    await publishReminderDueEvent("admin1", "user2", {
      reminderId: "r1",
      leadId: "lead9",
    });

    expect(getChannel).toHaveBeenCalledWith("crm:tenant:admin1");
    expect(publish).toHaveBeenCalledWith("reminder.due", {
      reminderId: "r1",
      leadId: "lead9",
      userId: "user2",
    });
  });
});
