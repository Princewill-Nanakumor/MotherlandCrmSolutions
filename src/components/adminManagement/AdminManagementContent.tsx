// src/components/adminManagement/AdminManagementContent.tsx
"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { MotherlandLogo } from "@/components/brand/MotherlandLogo";
import AdminStats from "./AdminStats";
import AdminList from "./AdminList";
import { useAdminOverview, useDeleteAdmin } from "@/hooks/useAdminData";
import type { AdminStats as TenantAdminStats } from "@/types/adminTypes";

export default function AdminManagementContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);

  // React Query hooks
  const { data, isLoading, isError, error, refetch, isFetching } =
    useAdminOverview();

  const deleteAdminMutation = useDeleteAdmin();

  // Extract data from React Query response
  const admins = data?.admins || [];
  const platformStats = data?.platformStats || null;

  useEffect(() => {
    const envEmails = process.env.SUPER_ADMIN_EMAILS;
    if (envEmails) {
      setAllowedEmails(envEmails.split(",").map((email) => email.trim()));
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
    } else if (status === "authenticated") {
      if (session?.user?.role !== "ADMIN") {
        router.push("/dashboard");
      } else if (
        allowedEmails.length > 0 &&
        !allowedEmails.includes(session.user.email)
      ) {
        router.push("/dashboard");
      }
    }
  }, [status, session, router, allowedEmails]);

  // Handle admin deletion with React Query mutation
  const handleAdminDeleted = async (admin: TenantAdminStats) => {
    try {
      const adminName = `${admin.firstName} ${admin.lastName}`;

      await deleteAdminMutation.mutateAsync({
        adminId: admin._id,
        adminEmail: admin.email,
      });

      // Success toast
      toast({
        title: "Admin Deleted Successfully",
        description: `${adminName} and all associated data have been permanently deleted.`,
        variant: "success",
      });

      console.log("✅ Admin deleted successfully");
    } catch (error) {
      console.error("❌ Failed to delete admin:", error);

      // Error toast
      toast({
        title: "Delete Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to delete admin. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle refresh with toast feedback
  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Data Refreshed",
        description: "Admin data has been successfully updated.",
        variant: "default",
      });
    } catch {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh admin data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Loading state
  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">
            {error instanceof Error
              ? error.message
              : "Failed to load admin data"}
          </p>
          <Button onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 border rounded-lg">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Management
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage all administrators and monitor their activities
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 border-green-200 dark:border-green-800">
            <MotherlandLogo className="mr-1 h-3 w-3 rounded-[22%]" />
            Super Admin
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isFetching}
            className="backdrop-blur-lg bg-white/70 dark:bg-gray-900/70"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <AdminStats platformStats={platformStats} />

      <AdminList
        admins={admins}
        allowedEmails={allowedEmails}
        onAdminDeleted={handleAdminDeleted}
        isDeleting={deleteAdminMutation.isPending}
      />
    </div>
  );
}
