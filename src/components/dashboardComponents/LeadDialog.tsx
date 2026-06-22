// src/components/dashboardComponents/LeadDialog.tsx
"use client";

import { Loader2 } from "lucide-react";
import { AssignLeadsDialog } from "@/components/dashboardComponents/AssignLeadsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";

interface LeadsDialogsProps {
  isDialogOpen: boolean;
  onDialogClose: () => void;
  users: User[];
  selectedUser: string;
  setSelectedUser: (user: string) => void;
  isLoadingUsers: boolean;
  isAssigning: boolean;
  onAssign: () => Promise<void>;
  onUnassign: () => Promise<void>;
  selectedLeads: Lead[];
  isUnassignDialogOpen: boolean;
  onUnassignDialogChange: (open: boolean) => void;
  isUnassigning: boolean;
  assignedLeadsCount: number;
}

export const LeadsDialogs: React.FC<LeadsDialogsProps> = ({
  isDialogOpen,
  onDialogClose,
  users,
  selectedUser,
  setSelectedUser,
  isLoadingUsers,
  isAssigning,
  onAssign,
  onUnassign,
  selectedLeads,
  isUnassignDialogOpen,
  onUnassignDialogChange,
  isUnassigning,
  assignedLeadsCount,
}) => {
  return (
    <>
      <AssignLeadsDialog
        isOpen={isDialogOpen}
        onClose={onDialogClose}
        users={users.filter((user) => user.status === "ACTIVE")}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        isLoadingUsers={isLoadingUsers}
        isAssigning={isAssigning}
        isUnassigning={isUnassigning}
        onAssign={onAssign}
        selectedLeads={selectedLeads}
      />

      <AlertDialog
        open={isUnassignDialogOpen}
        onOpenChange={(open) => {
          if (!open && isUnassigning) return; // Don't close while unassigning
          onUnassignDialogChange(open);
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .unassign-confirm-dialog .unassign-confirm-action {
                background-image: linear-gradient(to right, rgb(79 70 229), rgb(147 51 234)) !important;
                background-color: transparent !important;
                border-color: transparent !important;
                color: white !important;
              }
              .unassign-confirm-dialog .unassign-confirm-action:hover:not(:disabled) {
                background-image: linear-gradient(to right, rgb(67 56 202), rgb(126 34 206)) !important;
                background-color: transparent !important;
              }
            `,
          }}
        />
        <AlertDialogContent className="unassign-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unassign {assignedLeadsCount} lead
              {assignedLeadsCount > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the assignment from the selected leads. They will
              become unassigned and available for reassignment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnassigning}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                if (isUnassigning) {
                  e.preventDefault();
                  return;
                }
                e.preventDefault(); // Prevent Radix from closing - we close on success
                onUnassign();
              }}
              disabled={isUnassigning}
              className="unassign-confirm-action text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {isUnassigning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Unassigning...
                </>
              ) : (
                "Yes, Unassign"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
