import { expect, type Page } from "@playwright/test";
import { apiJson } from "./auth";

export type CallLogRow = {
  id?: string;
  leadId?: string | null;
  phoneNumber?: string;
  dialer?: string;
};

export async function fetchSessionUserId(page: Page): Promise<string> {
  const res = await apiJson(page, "/api/users/me");
  expect(res.status).toBe(200);
  const id = (res.body as { id?: string }).id;
  expect(id).toBeTruthy();
  return String(id);
}

export async function fetchCommentCount(page: Page, leadId: string): Promise<number> {
  const res = await apiJson(page, `/api/leads/${leadId}/comments`);
  expect(res.status).toBe(200);
  return Array.isArray(res.body) ? res.body.length : 0;
}

export async function fetchCallLogsForLead(
  page: Page,
  userId: string,
  leadId: string,
): Promise<CallLogRow[]> {
  const res = await apiJson(page, `/api/calls/user/${userId}`);
  expect(res.status).toBe(200);
  const logs =
    (res.body as { callLogs?: CallLogRow[] }).callLogs ?? [];
  return logs.filter((log) => log.leadId === leadId);
}
