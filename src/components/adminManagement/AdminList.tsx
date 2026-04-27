// src/components/adminManagement/AdminList.tsx
"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "../ui/use-toast";
import { AdminCard } from "./AdminCard";
import { DeleteConfirmationDialog } from "./DeleteConfirmationDialog";
import { AdminStats } from "@/hooks/useAdminData"; // Import from the hook instead

interface AdminListProps {
  admins: AdminStats[];
  allowedEmails: string[];
  onAdminDeleted?: (admin: AdminStats) => void | Promise<void>;
  isDeleting?: boolean;
}

export default function AdminList({
  admins,
  allowedEmails,
  onAdminDeleted,
  isDeleting = false,
}: AdminListProps) {
  const { toast } = useToast();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminStats | null>(null);

  const handleDeleteClick = (admin: AdminStats) => {
    setAdminToDelete(admin);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!adminToDelete) return;

    try {
      await onAdminDeleted?.(adminToDelete);

      toast({
        title: "Admin Deleted",
        description: `Successfully deleted ${adminToDelete.firstName} ${adminToDelete.lastName} and all associated data.`,
        variant: "success",
      });

      setShowDeleteDialog(false);
      setAdminToDelete(null);
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast({
        title: "Delete Failed",
        description:
          error instanceof Error ? error.message : "Failed to delete admin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteDialog(false);
    setAdminToDelete(null);
  };

  return (
    <>
      <Card className="backdrop-blur-lg bg-white/70 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">
            All Administrators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {admins.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 dark:text-gray-400">
                  No administrators found
                </p>
              </div>
            ) : (
              admins.map((admin) => (
                <AdminCard
                  key={admin._id}
                  admin={admin}
                  allowedEmails={allowedEmails}
                  onDeleteClick={handleDeleteClick}
                  deletingAdminId={
                    isDeleting ? adminToDelete?._id || null : null
                  }
                />
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmationDialog
        isOpen={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        adminToDelete={adminToDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </>
  );
}
