"use client";

import dynamic from "next/dynamic";
import { useSearchContext } from "@/context/SearchContext";
import { useToggleContext } from "@/context/ToggleContext";
import { AllLeadsPageLoadingShell } from "@/components/dashboardComponents/AllLeadsPageLoadingShell";
import { usePrefetchAllLeads } from "@/hooks/leadsPage/usePrefetchAllLeads";

function AllLeadsPageDynamicFallback() {
  const { showHeader } = useToggleContext();
  return <AllLeadsPageLoadingShell showHeader={showHeader} />;
}

const LeadsPageContent = dynamic(
  () => import("@/components/dashboardComponents/LeadsPageContent"),
  {
    loading: () => <AllLeadsPageDynamicFallback />,
    ssr: false,
  },
);

const AllLeadsPage: React.FC = () => {
  const { searchQuery, setLayoutLoading } = useSearchContext();
  usePrefetchAllLeads(searchQuery);

  return (
    <LeadsPageContent
      searchQuery={searchQuery}
      setLayoutLoading={setLayoutLoading}
    />
  );
};

export default AllLeadsPage;
