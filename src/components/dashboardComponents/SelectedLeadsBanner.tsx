"use client";

import React from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSelectedLeads, useClearSelection } from "@/stores/leadsStore";

/**
 * Shows a sticky banner when the user has selected leads on the all-leads page
 * and has navigated away. Lets them cancel (clear selection) without going back.
 */
export function SelectedLeadsBanner() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const selectedLeads = useSelectedLeads();
  const clearSelection = useClearSelection();

  const isAdmin = session?.user?.role === "ADMIN";
  const count = selectedLeads.length;
  const isAllLeadsPage = pathname === "/dashboard/all-leads";

  if (!isAdmin || count === 0 || !isAllLeadsPage) return null;

  return (
    <div className="sticky top-0 z-20 flex items-center justify-between gap-4 px-4 py-2 text-sm text-indigo-900 border-b border-indigo-200 bg-indigo-50 dark:bg-indigo-950/50 dark:border-indigo-800 dark:text-indigo-100">
      <span>
        {count} lead{count !== 1 ? "s" : ""} selected
        <Link
          href="/dashboard/all-leads"
          className="ml-2 font-medium underline hover:no-underline"
        >
          Back to All Leads
        </Link>
      </span>
      <Button
        variant="destructive"
        size="sm"
        onClick={() => clearSelection()}
        className="shrink-0"
      >
        <X className="mr-1.5 h-4 w-4" />
        Cancel selection
      </Button>
    </div>
  );
}
