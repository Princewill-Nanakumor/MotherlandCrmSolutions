// src/components/dashboardComponents/BulkActions.tsx
"use client";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Lead } from "@/types/leads";
import { Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface BulkActionsProps {
  selectedLeads: Lead[];
  hasAssignedLeads: boolean;
  assignedLeadsCount: number;
  isUpdating: boolean;
  onAssign: () => void;
  onUnassign: () => void;
  onStatusChange: (statusId: string) => Promise<void>;
  onDelete: () => Promise<void>;
  statuses?: Array<{ id: string; name: string; color?: string; _id?: string }>;
  isLoadingStatuses?: boolean;
}

// Update your BulkActions component to show immediate feedback
export const BulkActions: React.FC<BulkActionsProps> = ({
  selectedLeads,
  hasAssignedLeads,
  assignedLeadsCount,
  isUpdating,
  onAssign,
  onUnassign,
  onStatusChange,
  onDelete,
  statuses: propStatuses,
  isLoadingStatuses: propIsLoadingStatuses,
}) => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [isUnassigning, setIsUnassigning] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Fetch statuses if not provided via props
  const { data: fetchedStatuses = [], isLoading: isFetchingStatuses } =
    useQuery({
      queryKey: ["statuses"],
      queryFn: async () => {
        const response = await fetch("/api/statuses", {
          credentials: "include",
        });
        if (!response.ok) throw new Error("Failed to fetch statuses");
        return response.json();
      },
      enabled: !propStatuses, // Only fetch if not provided via props
      staleTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    });

  const statuses = propStatuses || fetchedStatuses;
  const isLoadingStatuses = propIsLoadingStatuses ?? isFetchingStatuses;

  const handleAssign = async () => {
    setIsAssigning(true);
    try {
      await onAssign();
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassign = async () => {
    setIsUnassigning(true);
    try {
      await onUnassign();
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleStatusChange = async (statusId: string) => {
    if (!statusId) return;
    setIsChangingStatus(true);
    try {
      await onStatusChange(statusId);
      setSelectedStatus(""); // Reset after successful change
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        `Are you sure you want to delete ${selectedLeads.length} lead(s)? This action cannot be undone.`,
      )
    ) {
      return;
    }
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  };

  if (selectedLeads.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center w-full gap-2">
      <Button
        variant="default"
        className="shrink-0"
        onClick={handleAssign}
        disabled={isUpdating || isAssigning || isChangingStatus || isDeleting}
      >
        {isAssigning ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 sm:mr-2 animate-spin" />
            Assigning...
          </>
        ) : (
          <>
            Assign{" "}
            <span className="hidden sm:inline">
              {selectedLeads.length} Lead{selectedLeads.length > 1 ? "s" : ""}
            </span>
          </>
        )}
      </Button>
      {hasAssignedLeads && (
        <Button
          variant="destructive"
          className="shrink-0"
          onClick={handleUnassign}
          disabled={
            isUpdating || isUnassigning || isChangingStatus || isDeleting
          }
        >
          {isUnassigning ? (
            <>
              <Loader2 className="w-4 h-4 mr-1.5 sm:mr-2 animate-spin" />
              <span className="hidden sm:inline">Unassigning...</span>
            </>
          ) : (
            <>
              Unassign{" "}
              <span className="hidden sm:inline">
                {assignedLeadsCount} Lead{assignedLeadsCount > 1 ? "s" : ""}
              </span>
            </>
          )}
        </Button>
      )}
      <Select
        value={selectedStatus}
        onValueChange={handleStatusChange}
        disabled={
          isUpdating || isChangingStatus || isDeleting || isLoadingStatuses
        }
      >
        <SelectTrigger className="w-full min-w-35 max-w-45 shrink-0">
          <SelectValue placeholder="Change Status" />
        </SelectTrigger>
        <SelectContent>
          {isLoadingStatuses ? (
            <SelectItem value="loading" disabled>
              Loading statuses...
            </SelectItem>
          ) : statuses.length > 0 ? (
            statuses.map(
              (status: {
                id: string;
                name: string;
                color?: string;
                _id?: string;
              }) => (
                <SelectItem
                  key={status._id || status.id}
                  value={status._id || status.id || ""}
                >
                  <div className="flex items-center gap-2">
                    {status.color && (
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: status.color }}
                      />
                    )}
                    <span>{status.name}</span>
                  </div>
                </SelectItem>
              ),
            )
          ) : (
            <SelectItem value="NEW">New</SelectItem>
          )}
        </SelectContent>
      </Select>
      {isChangingStatus && (
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 shrink-0">
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          <span className="hidden sm:inline">Changing status...</span>
        </div>
      )}
      <Button
        variant="destructive"
        className="shrink-0"
        onClick={handleDelete}
        disabled={
          isUpdating ||
          isAssigning ||
          isUnassigning ||
          isChangingStatus ||
          isDeleting
        }
      >
        {isDeleting ? (
          <>
            <Loader2 className="w-4 h-4 mr-1.5 sm:mr-2 animate-spin" />
            <span className="hidden sm:inline">Deleting...</span>
          </>
        ) : (
          <>
            <Trash2 className="w-4 h-4 mr-1.5 sm:mr-2" />
            Delete{" "}
            <span className="hidden sm:inline">
              {selectedLeads.length} Lead{selectedLeads.length > 1 ? "s" : ""}
            </span>
          </>
        )}
      </Button>
    </div>
  );
};
export default BulkActions;
