import { describe, expect, it } from "vitest";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  LEAD_UPDATED_EVENT,
  REMINDER_DUE_EVENT,
  getAdminLeadsChannelName,
  getLeadChannelName,
  getSuperAdminNotificationsChannelName,
  getUserNotificationsChannelName,
  getUserRemindersChannelName,
} from "./realtime";

describe("ably realtime channel names", () => {
  it("builds tenant-scoped lead channel", () => {
    expect(getLeadChannelName("admin1", "lead9")).toBe(
      "crm:admin:admin1:lead:lead9",
    );
  });

  it("builds admin leads broadcast channel", () => {
    expect(getAdminLeadsChannelName("admin1")).toBe("crm:admin:admin1:leads");
  });

  it("builds user reminder and notification channels", () => {
    expect(getUserRemindersChannelName("admin1", "user2")).toBe(
      "crm:admin:admin1:user:user2:reminders",
    );
    expect(getUserNotificationsChannelName("admin1", "user2")).toBe(
      "crm:admin:admin1:user:user2:notifications",
    );
  });

  it("exposes stable event names", () => {
    expect(LEAD_UPDATED_EVENT).toBe("lead.updated");
    expect(REMINDER_DUE_EVENT).toBe("reminder.due");
    expect(ADMIN_LEADS_UPDATED_EVENT).toBe("admin.leads.updated");
    expect(getSuperAdminNotificationsChannelName()).toBe(
      "crm:super-admin:notifications",
    );
  });
});
