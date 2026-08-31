"use client";

import dynamic from "next/dynamic";
import { TableSkeleton } from "@/components/leads/UserLeadsLoadingStates";
import { usePrefetchAssignedLeads } from "@/hooks/leadsPage/usePrefetchAssignedLeads";

const UserLeadsContent = dynamic(
  () => import("@/components/leads/UserLeadsContent"),
  {
    loading: () => <TableSkeleton />,
    ssr: false,
  },
);

const ReactQueryDevtools = dynamic(
  () =>
    import("@tanstack/react-query-devtools").then(
      (mod) => mod.ReactQueryDevtools,
    ),
  { ssr: false },
);

export default function UserLeadsPage() {
  usePrefetchAssignedLeads();

  return (
    <>
      <UserLeadsContent />

      {process.env.NODE_ENV === "development" && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
          position="bottom"
        />
      )}
    </>
  );
}
