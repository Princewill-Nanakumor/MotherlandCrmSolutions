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
        onAssign={onAssign}
        onUnassign={onUnassign}
        selectedLeads={selectedLeads}
      />

      <AlertDialog
        open={isUnassignDialogOpen}
        onOpenChange={onUnassignDialogChange}
      >
        <AlertDialogContent>
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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onUnassign} disabled={isUnassigning}>
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
