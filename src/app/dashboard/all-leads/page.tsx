"use client";

import dynamic from "next/dynamic";
import { useSearchContext } from "@/context/SearchContext";
import { TableSkeleton } from "@/components/dashboardComponents/LeadsLoadingState";
import { usePrefetchAllLeads } from "@/hooks/leadsPage/usePrefetchAllLeads";

const LeadsPageContent = dynamic(
  () => import("@/components/dashboardComponents/LeadsPageContent"),
  {
    loading: () => <TableSkeleton />,
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
