// src/components/dashboardComponents/AssignLeadsDialog.tsx
"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User } from "@/types/user.types";
import { Lead } from "@/types/leads";
import { MAX_ASSIGNED_LEADS_PER_AGENT } from "@/lib/leadAssignmentQuery";
import {
  formatPersonName,
  getLeadAssignedDisplayName,
  getLeadAssignedUserId,
  isLeadAssignedToActiveUser,
} from "@/lib/leadAssignmentDisplay";

interface AssignLeadsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  selectedUser: string;
  setSelectedUser: (value: string) => void;
  isLoadingUsers: boolean;
  isAssigning: boolean;
  isUnassigning?: boolean;
  onAssign: () => Promise<void>;
  selectedLeads: Lead[];
}

export function AssignLeadsDialog({
  isOpen,
  onClose,
  users,
  selectedUser,
  setSelectedUser,
  isLoadingUsers,
  isAssigning,
  isUnassigning = false,
  onAssign,
  selectedLeads,
}: AssignLeadsDialogProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const assignableUsers = users.filter((user) => user.role !== "ADMIN");
  const firstSelectedLead = selectedLeads?.[0];
  const isSingleLead = selectedLeads.length === 1;
  const currentAssigneeLabel =
    isSingleLead && firstSelectedLead
      ? getLeadAssignedDisplayName(
          firstSelectedLead.assignedTo,
          assignableUsers,
        )
      : "Unassigned";
  const showCurrentAssignee =
    isSingleLead &&
    isLeadAssignedToActiveUser(
      firstSelectedLead?.assignedTo,
      assignableUsers,
    );
  const hasActiveAssignment = selectedLeads.some((lead) =>
    isLeadAssignedToActiveUser(lead.assignedTo, assignableUsers),
  );

  const handleClose = () => {
    if (isAssigning || isUnassigning) return;
    setSelectedUser("");
    onClose();
  };

  const handleAssignClick = () => {
    if (!selectedUser) return;

    const isReassigning = hasActiveAssignment;
    if (isReassigning) {
      setIsConfirmOpen(true);
    } else {
      onAssign();
    }
  };

  const handleConfirmAssign = () => {
    onAssign();
    setIsConfirmOpen(false);
  };

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-lg dark:bg-gray-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedLeads.length > 1
                ? "Assign Multiple Leads"
                : hasActiveAssignment
                  ? "Reassign Lead"
                  : "Assign Lead"}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {showCurrentAssignee && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-white">
                  Currently assigned to
                </label>
                <div className="px-3 py-2 text-sm rounded-md bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-white">
                  {currentAssigneeLabel}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500 dark:text-gray-400">
              Each agent can have at most {MAX_ASSIGNED_LEADS_PER_AGENT} assigned
              leads on their leads page.
            </p>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white">
                {hasActiveAssignment
                  ? "Select new assignee"
                  : "Select User"}
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="w-4 h-4 animate-spin brand-icon" />
                </div>
              ) : (
                <Select
                  value={selectedUser || undefined}
                  onValueChange={setSelectedUser}
                >
                  <SelectTrigger className="w-full dark:bg-gray-700">
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent className="z-70">
                    {assignableUsers.length > 0 ? (
                      assignableUsers.map((user) => {
                        const isCurrentAssignee = selectedLeads.some(
                          (lead) =>
                            getLeadAssignedUserId(lead.assignedTo) === user.id,
                        );
                        const displayName = formatPersonName(
                          user.firstName,
                          user.lastName,
                        );
                        return (
                          <SelectItem
                            key={user.id}
                            value={user.id}
                            disabled={isCurrentAssignee}
                          >
                            {displayName}
                            {isCurrentAssignee ? " (Current)" : ""}
                          </SelectItem>
                        );
                      })
                    ) : (
                      <SelectItem value="no-users" disabled>
                        No agents available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="flex justify-end mt-8 space-x-2">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              onClick={handleAssignClick}
              disabled={isAssigning || isUnassigning || !selectedUser}
            >
              {isAssigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : hasActiveAssignment ? (
                "Reassign"
              ) : (
                "Assign"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Reassign Confirmation Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-60">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => !isAssigning && setIsConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-lg dark:bg-gray-800">
            <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
              Are you sure you want to reassign?
            </h3>
            <p className="mb-4 text-gray-600 dark:text-white">
              One or more of these leads are already assigned. Reassigning will
              change the owner.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsConfirmOpen(false)}
                disabled={isAssigning}
              >
                Cancel
              </Button>
              <Button onClick={handleConfirmAssign} disabled={isAssigning}>
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Reassigning...
                  </>
                ) : (
                  "Yes, Reassign"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
