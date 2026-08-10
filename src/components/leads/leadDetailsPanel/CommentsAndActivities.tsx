// src/components/leads/leadDetailsPanel/CommentsAndActivities.tsx
"use client";

import { FC, useState } from "react";
import { Lead } from "@/types/leads";
import { MessageSquare, Bell } from "lucide-react";
import CommentsAndActivitiesCombined from "./CommentsAndActivitiesCombined";
import RemindersTab from "./RemindersTab";
import { useQuery } from "@tanstack/react-query";
import { Reminder } from "@/types/leads";

interface CommentsAndActivitiesProps {
  lead: Lead;
  onLeadUpdated?: (updatedLead: Lead) => Promise<boolean>;
}

const CommentsAndActivities: FC<CommentsAndActivitiesProps> = ({ lead }) => {
  const [activeTab, setActiveTab] = useState<"comments" | "reminders">(
    "comments",
  );

  // Fetch reminders count for badge
  const { data: reminders = [] } = useQuery({
    queryKey: ["reminders", lead._id],
    queryFn: async (): Promise<Reminder[]> => {
      const response = await fetch(`/api/leads/${lead._id}/reminders`);
      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!lead._id,
    staleTime: 0,
    refetchInterval: 60 * 1000,
  });

  const pendingRemindersCount = reminders.filter(
    (r) => r.status === "PENDING" || r.status === "SNOOZED",
  ).length;

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 bg-white dark:bg-gray-800">
      <div className="flex flex-wrap items-center gap-1 p-3 border-b border-gray-200 sm:justify-between sm:gap-2 sm:p-6 dark:border-gray-700">
        <div className="flex flex-wrap gap-1 w-full min-w-0">
          <button
            onClick={() => setActiveTab("comments")}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm sm:px-4 sm:gap-2 ${activeTab === "comments" ? "brand-tab-active" : "text-gray-700! hover:bg-gray-100 dark:text-white! dark:hover:bg-gray-700/50"}`}
          >
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            <span className="sm:hidden">Comments</span>
            <span className="hidden sm:inline">Comments & Activities</span>
          </button>
          <button
            onClick={() => setActiveTab("reminders")}
            className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm sm:px-4 sm:gap-2 ${activeTab === "reminders" ? "brand-tab-active" : "text-gray-700! hover:bg-gray-100 dark:text-white! dark:hover:bg-gray-700/50"}`}
          >
            <Bell className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
            Reminders
            {pendingRemindersCount > 0 && (
              <span className="px-2 py-0.5 text-xs bg-red-500 text-white! rounded-full">
                {pendingRemindersCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Keep timeline mounted so assign/unassign refetches update cache before tab switch */}
      <div className="flex flex-col flex-1 min-h-0">
        <div
          className={
            activeTab === "comments"
              ? "flex flex-col flex-1 min-h-0"
              : "hidden"
          }
          aria-hidden={activeTab !== "comments"}
        >
          <CommentsAndActivitiesCombined
            leadId={lead._id}
            leadCreatedAt={lead.createdAt}
          />
        </div>
        {activeTab === "reminders" && <RemindersTab leadId={lead._id} />}
      </div>
    </div>
  );
};

export default CommentsAndActivities;
