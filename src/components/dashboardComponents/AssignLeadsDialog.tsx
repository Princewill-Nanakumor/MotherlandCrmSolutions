// src/app/components/dashboardComponents/AssignLeadsDialog.tsx
"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { User } from "@/types/user.types";
import { Lead } from "@/types/leads";

interface AssignLeadsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  selectedUser: string;
  setSelectedUser: (value: string) => void;
  isLoadingUsers: boolean;
  isAssigning: boolean;
  onAssign: () => Promise<void>;
  onUnassign?: () => Promise<void>;
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
  onAssign,
  onUnassign,
  selectedLeads,
}: AssignLeadsDialogProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUnassignDialogOpen, setIsUnassignDialogOpen] = useState(false);

  const handleClose = () => {
    setSelectedUser(""); // Reset when closing
    onClose();
  };

  const handleAssignClick = () => {
    // If no user is selected, this means we want to unassign
    if (!selectedUser) {
      if (onUnassign) {
        setIsUnassignDialogOpen(true);
      }
      return;
    }

    // If a user is selected, this is a normal assign/reassign
    const isReassigning = selectedLeads.some((l) => l.assignedTo);
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

  const handleUnassignConfirm = () => {
    if (onUnassign) {
      onUnassign();
    }
    setIsUnassignDialogOpen(false);
  };

  const firstSelectedLead = selectedLeads?.[0];

  // Don't render anything if not open
  if (!isOpen) return null;

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            .assign-dialog label {
              color: rgb(55 65 81) !important; /* gray-700 */
            }
            .dark .assign-dialog label {
              color: rgb(255 255 255) !important; /* white */
            }
            .assign-dialog .assigned-user-name {
              color: rgb(55 65 81) !important; /* gray-700 */
            }
            .dark .assign-dialog .assigned-user-name {
              color: rgb(255 255 255) !important; /* white */
            }
            .assign-dialog select {
              color: rgb(17 24 39) !important; /* gray-900 */
            }
            .dark .assign-dialog select {
              color: rgb(255 255 255) !important; /* white */
            }
            .assign-dialog select option {
              color: rgb(17 24 39) !important; /* gray-900 */
              background-color: rgb(255 255 255) !important;
            }
            .dark .assign-dialog select option {
              color: rgb(255 255 255) !important; /* white */
              background-color: rgb(55 65 81) !important; /* gray-700 */
            }
            /* Force gradient buttons to display correctly - override Button component default variant */
            button[data-slot="button"][class*="bg-gradient-to-r"],
            .assign-dialog button[data-slot="button"][class*="bg-gradient-to-r"] {
              background-image: linear-gradient(to right, rgb(79 70 229), rgb(147 51 234)) !important;
              background-color: transparent !important;
              border-color: transparent !important;
            }
            button[data-slot="button"][class*="bg-gradient-to-r"]:hover,
            .assign-dialog button[data-slot="button"][class*="bg-gradient-to-r"]:hover {
              background-image: linear-gradient(to right, rgb(67 56 202), rgb(126 34 206)) !important;
              background-color: transparent !important;
            }
            button[data-slot="button"][class*="bg-gradient-to-r"]:not(:disabled),
            .assign-dialog button[data-slot="button"][class*="bg-gradient-to-r"]:not(:disabled) {
              color: white !important;
            }
          `,
        }}
      />
      {/* Main Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />
        <div className="assign-dialog relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {selectedLeads.length > 1
                ? "Assign Multiple Leads"
                : firstSelectedLead?.assignedTo
                  ? "Reassign Lead"
                  : "Assign Lead"}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            {firstSelectedLead?.assignedTo && selectedLeads.length === 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Currently assigned to
                </label>
                <div className="assigned-user-name px-3 py-2 bg-gray-50 dark:bg-gray-700 rounded-md text-sm">
                  {typeof firstSelectedLead.assignedTo === "string"
                    ? firstSelectedLead.assignedTo
                    : `${firstSelectedLead.assignedTo.firstName} ${firstSelectedLead.assignedTo.lastName}`}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">
                {selectedLeads.some((l) => l.assignedTo)
                  ? "Select new assignee"
                  : "Select User"}
              </label>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center p-2">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-500 dark:text-white" />
                </div>
              ) : (
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Select a user</option>
                  {users && users.length > 0 ? (
                    users.map((user) => {
                      const isCurrentAssignee = selectedLeads.some(
                        (l) => l.assignedTo?.id === user.id
                      );
                      return (
                        <option
                          key={user.id}
                          value={user.id}
                          disabled={isCurrentAssignee}
                        >
                          {user.firstName} {user.lastName}
                          {isCurrentAssignee && " (Current)"}
                        </option>
                      );
                    })
                  ) : (
                    <option value="no-users" disabled>
                      No users available
                    </option>
                  )}
                </select>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAssignClick}
                disabled={isAssigning || !selectedUser}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : selectedLeads.some((l) => l.assignedTo) ? (
                  "Reassign"
                ) : (
                  "Assign"
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsConfirmOpen(false)}
          />
          <div className="assign-dialog relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Are you sure you want to reassign?
            </h3>
            <p className="text-gray-600 dark:text-white mb-4">
              One or more of these leads are already assigned. Reassigning will
              change the owner.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsConfirmOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmAssign}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                Yes, Reassign
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Dialog */}
      {isUnassignDialogOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsUnassignDialogOpen(false)}
          />
          <div className="assign-dialog relative bg-white dark:bg-gray-800 rounded-lg shadow-lg w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Are you sure you want to unassign?
            </h3>
            <p className="text-gray-600 dark:text-white mb-4">
              Unassigning will remove the owner from these leads.
            </p>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setIsUnassignDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUnassignConfirm}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white"
              >
                Yes, Unassign
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
