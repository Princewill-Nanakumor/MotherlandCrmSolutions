// src/components/dashboardComponents/StatusModal.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { Status } from "@/types/leads";
import { useStatuses } from "@/context/StatusContext";

interface StatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStatusCreated?: () => void;
}

const StatusModal = ({
  isOpen,
  onClose,
  onStatusCreated,
}: StatusModalProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { refreshStatuses } = useStatuses();
  const [formData, setFormData] = useState({
    name: "",
    color: "#000000",
  });
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [loading, setLoading] = useState(true);

  const isProtectedStatus = (status: Status) => {
    const statusId = status.id || status._id || "";
    const statusName = (status.name || "").trim().toUpperCase();
    return statusId === "NEW" || statusName === "NEW";
  };

  const fetchStatuses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/statuses");
      if (!response.ok) {
        throw new Error("Failed to fetch statuses");
      }
      const data = await response.json();
      setStatuses(data);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to load statuses";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error("Error fetching statuses:", error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch statuses when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchStatuses();
    }
  }, [isOpen, fetchStatuses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      const url = isEditing ? `/api/statuses/${editingId}` : "/api/statuses";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to ${isEditing ? "update" : "create"} status`,
        );
      }

      // Parse the response
      const newStatus = await response.json();

      // ✅ OPTIMIZATION: Update local state immediately for instant UI feedback
      if (isEditing && editingId) {
        setStatuses((prev) =>
          prev.map((status) =>
            status._id === editingId ? { ...status, ...formData } : status,
          ),
        );
      } else {
        // Add the new status to local state immediately
        setStatuses((prev) => [...prev, newStatus]);
      }

      // Show success toast immediately
      toast({
        title: "Success!",
        description: `Status ${isEditing ? "updated" : "created"} successfully`,
        variant: "success",
      });

      resetForm();
      onStatusCreated?.();

      // ✅ OPTIMIZATION: Run cache invalidations in parallel in the background
      // This doesn't block the UI or the button
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["statuses"],
          exact: false,
        }),
        queryClient.invalidateQueries({
          queryKey: ["leads"],
          exact: false,
        }),
        refreshStatuses(),
      ]).catch((error) => {
        console.error("Error refreshing caches:", error);
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${isEditing ? "update" : "create"} status`;
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      console.error(
        `Error ${isEditing ? "updating" : "creating"} status:`,
        error,
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleEdit = (status: Status) => {
    if (isProtectedStatus(status)) return;
    setFormData({
      name: status.name,
      color: status.color || "#000000",
    });
    setEditingId(status.id || status._id || "");
    setIsEditing(true);
  };

  const handleDelete = async (statusId: string) => {
    if (window.confirm("Are you sure you want to delete this status?")) {
      try {
        const response = await fetch(`/api/statuses/${statusId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete status");
        }

        // ✅ OPTIMIZATION: Update local state immediately
        setStatuses((prev) => prev.filter((status) => status._id !== statusId));

        toast({
          title: "Success!",
          description: "Status deleted successfully",
          variant: "success",
        });

        // ✅ OPTIMIZATION: Run cache invalidations in parallel in the background
        Promise.all([
          queryClient.invalidateQueries({
            queryKey: ["statuses"],
            exact: false,
          }),
          queryClient.invalidateQueries({
            queryKey: ["leads"],
            exact: false,
          }),
          refreshStatuses(),
        ]).catch((error) => {
          console.error("Error refreshing caches:", error);
        });
      } catch (err: unknown) {
        console.error("Error deleting status:", err);
        toast({
          title: "Error",
          description:
            err instanceof Error ? err.message : "Failed to delete status",
          variant: "destructive",
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({ name: "", color: "#000000" });
    setIsEditing(false);
    setEditingId(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-gray-900! dark:text-white!">
            {isEditing ? "Edit Status" : "Create New Status"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-6">
          {/* Create/Edit Status Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700! dark:text-white!">
                Status Name
              </label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter status name"
                required
                className="mt-1"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700! dark:text-white!">
                Select Color
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) =>
                    setFormData({ ...formData, color: e.target.value })
                  }
                  required
                  className="w-20 p-1 mt-1"
                />
                <div className="flex-1 p-2 border border-gray-200 rounded dark:border-gray-700">
                  <div
                    className="w-full h-full rounded"
                    style={{ backgroundColor: formData.color }}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className="mr-2"
                >
                  Cancel Edit
                </Button>
              )}
              <Button type="button" variant="outline" onClick={handleClose}>
                Close
              </Button>
              <Button
                type="submit"
                disabled={isCreating}
                className="text-white border-0 bg-linear-to-br from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {isEditing ? "Updating..." : "Creating..."}
                  </>
                ) : isEditing ? (
                  "Update Status"
                ) : (
                  "Create Status"
                )}
              </Button>
            </DialogFooter>
          </form>
          {/* Existing Statuses */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm text-gray-900! dark:text-white!">
                Existing Statuses
              </h3>
              <span className="text-xs text-gray-900! dark:text-white! font-medium bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                {statuses.length}{" "}
                {statuses.length === 1 ? "status" : "statuses"}
              </span>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500! dark:text-gray-400!" />
              </div>
            ) : (
              <div
                className={`grid gap-2 ${
                  statuses.length > 5 ? "max-h-64 overflow-y-auto pr-2" : ""
                }`}
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "#9CA3AF #F3F4F6",
                }}
              >
                {statuses.length === 0 ? (
                  <div className="text-center py-4 text-gray-500! dark:text-gray-400! text-sm">
                    No statuses found. Create your first status above.
                  </div>
                ) : (
                  statuses.map((status) => (
                    <div
                      key={status._id}
                      className="flex items-center justify-between p-2 border border-gray-200 rounded-md dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-gray-800! dark:text-white!">
                          {status.name}
                        </span>
                        <code className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-sm text-gray-600! dark:text-white!">
                          {status.color}
                        </code>
                      </div>
                      <div className="flex gap-2">
                        {!isProtectedStatus(status) ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(status)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleDelete(status.id || status._id || "")
                              }
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StatusModal;
