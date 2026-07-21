import { LeadDetailsRoutePage } from "@/components/leads/LeadDetailsRoutePage";

export default function AgentLeadDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <LeadDetailsRoutePage mode="agent" params={params} />;
}
