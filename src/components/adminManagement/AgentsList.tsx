// src/components/adminManagement/AgentsList.tsx
"use client";

import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { useDeleteAgentFromTenant } from "@/hooks/useAdminData";

interface Agent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  lastLogin?: string;
  createdAt: string;
}

interface AgentsListProps {
  agents: Agent[];
  tenantAdminId: string;
  isSuperAdmin: boolean;
  getStatusColor: (status: string) => string;
  formatLastLogin: (lastLogin?: string) => string;
}

export default function AgentsList({
  agents,
  tenantAdminId,
  isSuperAdmin,
  getStatusColor,
  formatLastLogin,
}: AgentsListProps) {
  const { toast } = useToast();
  const deleteAgentMutation = useDeleteAgentFromTenant();
  const [confirmAgent, setConfirmAgent] = useState<Agent | null>(null);

  const handleDelete = async () => {
    if (!confirmAgent) return;
    try {
      await deleteAgentMutation.mutateAsync({
        adminId: tenantAdminId,
        agentId: confirmAgent._id,
      });
      toast({
        title: "Agent removed",
        description: `${confirmAgent.firstName} ${confirmAgent.lastName} has been deleted from this administrator.`,
        variant: "success",
      });
    } catch (e) {
      toast({
        title: "Could not remove agent",
        description:
          e instanceof Error ? e.message : "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setConfirmAgent(null);
    }
  };

  return (
    <>
      <Card className="border border-gray-200 backdrop-blur-lg bg-white/70 dark:bg-gray-800 dark:border-white/10 rounded-xl">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Agents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {agents.length === 0 ? (
              <p className="py-8 text-center text-gray-500 dark:text-gray-400">
                No agents found
              </p>
            ) : (
              agents.map((agent) => (
                <div
                  key={agent._id}
                  className="flex items-center justify-between gap-3 p-4 transition-all duration-200 border rounded-lg bg-white/50 dark:bg-gray-800/50 hover:bg-white/70"
                >
                  <div className="flex items-center min-w-0 space-x-4">
                    <Avatar>
                      <AvatarFallback className="text-white bg-linear-to-r from-indigo-600 to-purple-600">
                        {agent.firstName[0]}
                        {agent.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {agent.firstName} {agent.lastName}
                      </h4>
                      <p className="text-sm text-gray-600 truncate dark:text-gray-400">
                        {agent.email}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <Badge className={getStatusColor(agent.status)}>
                          {agent.status}
                        </Badge>
                        <span className="text-xs text-gray-500 dark:text-gray-300">
                          Last login: {formatLastLogin(agent.lastLogin)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isSuperAdmin ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="shrink-0 border-red-200 text-red-700 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
                      onClick={() => setConfirmAgent(agent)}
                      disabled={deleteAgentMutation.isPending}
                      aria-label={`Remove agent ${agent.firstName} ${agent.lastName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={!!confirmAgent}
        onOpenChange={(open) => {
          if (!open) setConfirmAgent(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this agent?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAgent
                ? `This will permanently delete ${confirmAgent.firstName} ${confirmAgent.lastName} (${confirmAgent.email}) and their leads, activities, and related data for this tenant. This cannot be undone.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteAgentMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAgentMutation.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteAgentMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove agent"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
