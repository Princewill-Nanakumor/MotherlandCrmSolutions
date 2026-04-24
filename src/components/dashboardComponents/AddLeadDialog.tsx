// src/components/dashboardComponents/AddLeadDialog.tsx
"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2, Plus, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useStatuses } from "@/context/StatusContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddLeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  status: string;
}

interface AddLeadDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddLeadDialog: React.FC<AddLeadDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // Fetch statuses from context
  const { statuses, isLoading: isLoadingStatuses } = useStatuses();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AddLeadFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "",
      source: "Manual Entry",
      status: statuses[0]?._id || statuses[0]?.id || "NEW",
    },
  });

  const selectedStatus = watch("status");

  // Update default status when statuses load
  React.useEffect(() => {
    if (statuses.length > 0 && !selectedStatus) {
      setValue("status", statuses[0]?._id || statuses[0]?.id || "NEW");
    }
  }, [statuses, selectedStatus, setValue]);

  // Check for duplicate email on blur
  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes("@")) {
      setEmailError(null);
      return false;
    }

    setIsCheckingEmail(true);
    setEmailError(null);

    try {
      const response = await fetch(
        `/api/leads/check-email?email=${encodeURIComponent(email)}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to check email");
      }

      const data = await response.json();

      if (data.exists) {
        setEmailError(
          `This email already exists for ${data.lead.name}. Please use a different email.`,
        );
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error checking email:", error);
      // Don't block submission if check fails
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  // Create lead mutation
  const createLeadMutation = useMutation({
    mutationFn: async (leadData: AddLeadFormData) => {
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([leadData]),
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create lead");
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate and refetch leads
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads", "all"] });

      toast({
        title: "Success!",
        description: "Lead created successfully",
        variant: "success",
      });

      // Reset form with default status
      reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        source: "Manual Entry",
        status: statuses[0]?._id || statuses[0]?.id || "NEW",
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create lead",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: AddLeadFormData) => {
    // Final email validation before submission
    const emailExists = await checkEmailExists(data.email);

    if (emailExists) {
      toast({
        title: "Duplicate Email",
        description: "A lead with this email already exists.",
        variant: "destructive",
      });
      return;
    }

    createLeadMutation.mutate(data);
  };

  const handleClose = () => {
    if (!createLeadMutation.isPending && !isCheckingEmail) {
      reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        country: "",
        source: "Manual Entry",
        status: statuses[0]?._id || statuses[0]?.id || "NEW",
      });
      setEmailError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-125 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add New Lead
          </DialogTitle>
          <DialogDescription>
            Fill in the details below to manually add a new lead to your
            database.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* First Name */}
          <div className="space-y-2">
            <Label htmlFor="firstName">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              placeholder="John"
              {...register("firstName", {
                required: "First name is required",
              })}
              disabled={createLeadMutation.isPending}
              className={errors.firstName ? "border-red-500" : ""}
            />
            {errors.firstName && (
              <p className="text-sm text-red-500">{errors.firstName.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              placeholder="Doe"
              {...register("lastName")}
              disabled={createLeadMutation.isPending}
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">
              Email <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                placeholder="john.doe@example.com"
                {...register("email", {
                  required: "Email is required",
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: "Invalid email address",
                  },
                })}
                onBlur={(e) => checkEmailExists(e.target.value)}
                disabled={createLeadMutation.isPending || isCheckingEmail}
                className={
                  errors.email || emailError
                    ? "border-red-500 pr-10"
                    : isCheckingEmail
                      ? "pr-10"
                      : ""
                }
              />
              {isCheckingEmail && (
                <div className="absolute -translate-y-1/2 right-3 top-1/2">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
            {errors.email && (
              <p className="text-sm text-red-500">{errors.email.message}</p>
            )}
            {emailError && !errors.email && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{emailError}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 234 567 8900"
              {...register("phone", {
                required: "Phone number is required",
              })}
              disabled={createLeadMutation.isPending}
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country">
              Country <span className="text-red-500">*</span>
            </Label>
            <Input
              id="country"
              placeholder="United States"
              {...register("country", {
                required: "Country is required",
              })}
              disabled={createLeadMutation.isPending}
              className={errors.country ? "border-red-500" : ""}
            />
            {errors.country && (
              <p className="text-sm text-red-500">{errors.country.message}</p>
            )}
          </div>

          {/* Source */}
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Input
              id="source"
              placeholder="Manual Entry"
              {...register("source")}
              disabled={createLeadMutation.isPending}
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setValue("status", value)}
              disabled={createLeadMutation.isPending || isLoadingStatuses}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    isLoadingStatuses ? "Loading statuses..." : "Select status"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {isLoadingStatuses ? (
                  <SelectItem value="loading" disabled>
                    Loading statuses...
                  </SelectItem>
                ) : statuses.length > 0 ? (
                  statuses.map((status) => (
                    <SelectItem
                      key={status._id || status.id}
                      value={status._id || status.id || ""}
                      style={{
                        backgroundColor: status.color
                          ? `${status.color}20`
                          : undefined,
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span>{status.name}</span>
                      </div>
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="NEW">New</SelectItem>
                )}
              </SelectContent>
            </Select>
            {isLoadingStatuses && (
              <p className="text-xs text-gray-500">
                Loading available statuses...
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createLeadMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createLeadMutation.isPending || isCheckingEmail || !!emailError
              }
              className="text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {createLeadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : isCheckingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Lead
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
