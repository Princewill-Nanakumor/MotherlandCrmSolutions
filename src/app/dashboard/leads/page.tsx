"use client";

import dynamic from "next/dynamic";
import { useToggleContext } from "@/context/ToggleContext";
import { UserLeadsPageLoadingShell } from "@/components/leads/UserLeadsPageLoadingShell";
import { usePrefetchAssignedLeads } from "@/hooks/leadsPage/usePrefetchAssignedLeads";

function UserLeadsPageDynamicFallback() {
  const toggleContext = useToggleContext();
  const showHeader = toggleContext?.showHeader ?? true;
  const showControls = toggleContext?.showControls ?? true;
  return (
    <UserLeadsPageLoadingShell
      showHeader={showHeader}
      showControls={showControls}
    />
  );
}

const UserLeadsContent = dynamic(
  () => import("@/components/leads/UserLeadsContent"),
  {
    loading: () => <UserLeadsPageDynamicFallback />,
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
