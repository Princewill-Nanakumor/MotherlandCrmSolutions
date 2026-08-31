// src/components/leads/leadDetailsPanel/RemindersTab.tsx
"use client";

import { FC, useCallback } from "react";
import { Reminder } from "@/types/leads";
import { useToast } from "@/components/ui/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Reminders from "./Reminders";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";

interface RemindersTabProps {
  leadId: string;
}

export const RemindersTab: FC<RemindersTabProps> = ({ leadId }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // React Query for fetching reminders
  const { data: reminders = [], isLoading: isLoadingReminders } = useQuery({
    queryKey: ["reminders", leadId],
    queryFn: async (): Promise<Reminder[]> => {
      const response = await apiCallWithSessionRefresh(`/api/leads/${leadId}/reminders`);
      if (!response.ok) {
        throw new Error(`Failed to fetch reminders: ${response.status}`);
      }
      return response.json();
    },
    enabled: !!leadId,
    staleTime: 0, // Don't cache - always treat as stale for immediate updates
    refetchInterval: 60 * 1000, // Check every minute for updates
    refetchOnWindowFocus: false,
  });

  // Add reminder mutation
  const addReminderMutation = useMutation({
    mutationFn: async (reminderData: {
      title: string;
      description?: string;
      reminderDate: string;
      reminderTime: string;
      type: string;
      soundEnabled: boolean;
      timezone: string;
    }) => {
      const response = await apiCallWithSessionRefresh(`/api/leads/${leadId}/reminders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reminderData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to create reminder: ${response.status} - ${errorText}`
        );
      }

      return await response.json();
    },
    onSuccess: (created: Reminder) => {
      queryClient.setQueryData<Reminder[]>(["reminders", leadId], (old) => {
        const list = old ?? [];
        if (!created?._id) return list;
        if (list.some((reminder) => reminder._id === created._id)) return list;
        return [created, ...list];
      });
      queryClient.invalidateQueries({
        queryKey: ["activities", leadId],
        refetchType: "none",
      });
      toast({
        title: "Success",
        description: "Reminder created successfully",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("Error creating reminder:", error);
      toast({
        title: "Error",
        description: "Failed to create reminder",
        variant: "destructive",
      });
    },
  });

  // Update reminder mutation
  const updateReminderMutation = useMutation({
    mutationFn: async ({
      reminderId,
      updates,
    }: {
      reminderId: string;
      updates: Partial<Reminder>;
    }) => {
      const response = await apiCallWithSessionRefresh(
        `/api/leads/${leadId}/reminders/${reminderId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        }
      );
      if (!response.ok) throw new Error("Failed to update reminder");
      return response.json();
    },
    onMutate: async ({ reminderId, updates }) => {
      // Optimistically update the cache immediately
      await queryClient.cancelQueries({ queryKey: ["reminders", leadId] });

      const previousReminders = queryClient.getQueryData<Reminder[]>([
        "reminders",
        leadId,
      ]);

      // Keep the upcoming card visible so the complete button can spin.
      if (updates.status !== "COMPLETED") {
        queryClient.setQueryData<Reminder[]>(["reminders", leadId], (old) => {
          if (!old) return old;
          return old.map((reminder) =>
            reminder._id === reminderId ? { ...reminder, ...updates } : reminder
          );
        });
      }

      return { previousReminders };
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousReminders) {
        queryClient.setQueryData(
          ["reminders", leadId],
          context.previousReminders
        );
      }
      console.error("Error updating reminder:", error);

      // Only show toast for non-sound toggle errors
      if (!variables.updates.hasOwnProperty("soundEnabled")) {
        toast({
          title: "Error",
          description: "Failed to update reminder",
          variant: "destructive",
        });
      }
    },
    onSuccess: (updated, variables) => {
      if (updated?._id) {
        queryClient.setQueryData<Reminder[]>(["reminders", leadId], (old) =>
          (old ?? []).map((reminder) =>
            reminder._id === updated._id ? updated : reminder,
          ),
        );
      }

      queryClient.invalidateQueries({
        queryKey: ["activities", leadId],
        refetchType: "none",
      });

      // Only show toast for non-sound toggle updates
      if (!variables.updates.hasOwnProperty("soundEnabled")) {
        toast({
          title: "Success",
          description: "Reminder updated successfully",
          variant: "success",
        });
      }
    },
  });

  // Delete reminder mutation
  const deleteReminderMutation = useMutation({
    mutationFn: async (reminderId: string) => {
      const response = await apiCallWithSessionRefresh(
        `/api/leads/${leadId}/reminders/${reminderId}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Failed to delete reminder");
    },
    onSuccess: (_data, reminderId) => {
      queryClient.setQueryData<Reminder[]>(["reminders", leadId], (old) =>
        (old ?? []).filter((reminder) => reminder._id !== reminderId),
      );
      // Defer timeline refresh — avoid refetching 100+ activities while on Reminders tab.
      queryClient.invalidateQueries({
        queryKey: ["activities", leadId],
        refetchType: "none",
      });
      toast({
        title: "Success",
        description: "Reminder deleted",
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("Error deleting reminder:", error);
      toast({
        title: "Error",
        description: "Failed to delete reminder",
        variant: "destructive",
      });
    },
  });

  // Handler functions for reminders
  const handleAddReminder = useCallback(
    (reminderData: {
      title: string;
      description?: string;
      reminderDate: string;
      reminderTime: string;
      type: string;
      soundEnabled: boolean;
      timezone: string;
    }) => {
      addReminderMutation.mutate(reminderData);
    },
    [addReminderMutation],
  );

  const handleCompleteReminder = useCallback(
    (reminderId: string) => {
      updateReminderMutation.mutate({
        reminderId,
        updates: { status: "COMPLETED" },
      });
    },
    [updateReminderMutation]
  );

  const handleSnoozeReminder = useCallback(
    (reminderId: string, minutes: number) => {
      const snoozedUntil = new Date(Date.now() + minutes * 60 * 1000);
      updateReminderMutation.mutate({
        reminderId,
        updates: {
          status: "SNOOZED",
          snoozedUntil: snoozedUntil.toISOString(),
        },
      });
    },
    [updateReminderMutation]
  );

  const handleDeleteReminder = useCallback(
    (reminderId: string) => {
      deleteReminderMutation.mutate(reminderId);
    },
    [deleteReminderMutation]
  );

  return (
    <Reminders
      reminders={reminders}
      isLoading={isLoadingReminders}
      leadId={leadId}
      onAddReminder={handleAddReminder}
      onUpdateReminder={(id, updates) =>
        updateReminderMutation.mutate({ reminderId: id, updates })
      }
      onDeleteReminder={handleDeleteReminder}
      onCompleteReminder={handleCompleteReminder}
      onSnoozeReminder={handleSnoozeReminder}
      isSaving={addReminderMutation.isPending}
      isCreateError={addReminderMutation.isError}
      deletingReminderId={
        deleteReminderMutation.isPending
          ? (deleteReminderMutation.variables ?? null)
          : null
      }
      completingReminderId={
        updateReminderMutation.isPending &&
        updateReminderMutation.variables?.updates.status === "COMPLETED"
          ? updateReminderMutation.variables.reminderId
          : null
      }
    />
  );
};

export default RemindersTab;
