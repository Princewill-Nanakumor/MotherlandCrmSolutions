import { LeadDetailsRoutePage } from "@/components/leads/LeadDetailsRoutePage";

export default function AdminLeadDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return <LeadDetailsRoutePage mode="admin" params={params} />;
}
