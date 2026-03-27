import Ably from "ably";
import { LEAD_UPDATED_EVENT, getLeadChannelName } from "@/libs/realtime";

let ablyRestClient: Ably.Rest | null = null;

function getAblyRestClient(): Ably.Rest | null {
  const apiKey = process.env.ABLY_API_KEY;
  if (!apiKey) return null;

  if (!ablyRestClient) {
    ablyRestClient = new Ably.Rest(apiKey);
  }

  return ablyRestClient;
}

export async function publishLeadUpdatedEvent(
  adminId: string,
  leadId: string,
  payload: Record<string, unknown>
): Promise<void> {
  const client = getAblyRestClient();
  if (!client) return;

  const channel = client.channels.get(getLeadChannelName(adminId, leadId));
  await channel.publish(LEAD_UPDATED_EVENT, payload);
}
