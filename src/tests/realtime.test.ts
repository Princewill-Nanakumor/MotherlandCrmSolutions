import { describe, expect, it } from "vitest";
import {
  ADMIN_LEADS_UPDATED_EVENT,
  LEAD_UPDATED_EVENT,
  REMINDER_DUE_EVENT,
  getAdminLeadsChannelName,
  getLeadChannelName,
  getSuperAdminNotificationsChannelName,
  getTenantChannelName,
  getUserNotificationsChannelName,
  getUserRemindersChannelName,
} from "@/libs/realtime";

describe("ably realtime channel names", () => {
  it("uses one tenant channel for leads, reminders, and notifications", () => {
    expect(getTenantChannelName("admin1")).toBe("crm:tenant:admin1");
    expect(getAdminLeadsChannelName("admin1")).toBe("crm:tenant:admin1");
    expect(getLeadChannelName("admin1", "lead9")).toBe("crm:tenant:admin1");
    expect(getUserRemindersChannelName("admin1", "user2")).toBe(
      "crm:tenant:admin1",
    );
    expect(getUserNotificationsChannelName("admin1", "user2")).toBe(
      "crm:tenant:admin1",
    );
  });

  it("exposes stable event names and super-admin channel", () => {
    expect(LEAD_UPDATED_EVENT).toBe("lead.updated");
    expect(REMINDER_DUE_EVENT).toBe("reminder.due");
    expect(ADMIN_LEADS_UPDATED_EVENT).toBe("admin.leads.updated");
    expect(getSuperAdminNotificationsChannelName()).toBe(
      "crm:super-admin:notifications",
    );
  });
});
