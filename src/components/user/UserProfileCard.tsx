// src/components/user/UserProfileCard.tsx
"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/use-toast";
import { ProfileSkeleton } from "./ProfileSkeleton";
import { ProfileContent } from "./ProfileContent";
import { useProfileData } from "@/hooks/useProfileData";
import { z } from "zod";

interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  country: string;
  role: string;
  status: string;
  permissions: string[];
  createdBy: string;
  createdAt: string;
  lastLogin?: string;
}

interface UserProfileCardProps {
  className?: string;
}

const profileValidationSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required.")
      .max(50, "First name is too long.")
      .regex(
        /^[A-Za-z][A-Za-z\s'-]*$/,
        "First name can only contain letters, spaces, apostrophes, and hyphens."
      ),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required.")
      .max(50, "Last name is too long.")
      .regex(
        /^[A-Za-z][A-Za-z\s'-]*$/,
        "Last name can only contain letters, spaces, apostrophes, and hyphens."
      ),
    country: z.string().trim(),
    phoneNumber: z.string().transform((value) => value.replace(/\s+/g, "").trim()),
  })
  .superRefine((data, ctx) => {
    if (!data.country) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["country"],
        message: "Country is required.",
      });
    } else if (data.country.length < 2 || data.country.length > 56) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["country"],
        message: "Country is invalid.",
      });
    }

    if (!data.phoneNumber) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Phone number is required.",
      });
      return;
    }

    if (/^\+[1-9]\d{0,3}$/.test(data.phoneNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Please enter the rest of the phone number after country code.",
      });
      return;
    }

    if (!/^\+[1-9]\d{7,14}$/.test(data.phoneNumber)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phoneNumber"],
        message: "Phone number must be in international format (e.g. +14155552671).",
      });
    }
  });

export default function GlassmorphismProfileCard({}: UserProfileCardProps) {
  const { data: session, status } = useSession();
  const { toast } = useToast();

  // Use React Query for profile data
  const { profile, isLoading, error, updateProfile, isUpdating } =
    useProfileData();

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<Partial<UserProfile>>({});
  const [formErrors, setFormErrors] = useState<Partial<
    Record<"firstName" | "lastName" | "country" | "phoneNumber", string>
  >>({});

  // Initialize edited profile when profile data is available
  React.useEffect(() => {
    if (profile && !isEditing) {
      setEditedProfile(profile);
    }
  }, [profile, isEditing]);

  const handleEdit = () => {
    setIsEditing(true);
    setEditedProfile(profile || {});
    setFormErrors({});
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedProfile(profile || {});
    setFormErrors({});
  };

  // Function to check if any changes were made
  const hasChanges = (): boolean => {
    if (!profile) return false;

    const editableFields: (keyof UserProfile)[] = [
      "firstName",
      "lastName",
      "phoneNumber",
      "country",
    ];

    return editableFields.some((field) => {
      const originalValue = profile[field] || "";
      const editedValue = editedProfile[field] || "";
      return originalValue !== editedValue;
    });
  };

  const handleSave = async () => {
    if (!profile) {
      toast({
        title: "Error",
        description: "No profile data available to update.",
        variant: "destructive",
      });
      return;
    }

    // Check if we have a valid ID (not a temporary one)
    if (!profile.id || profile.id === "temp-id" || profile.id === "") {
      toast({
        title: "Cannot update profile",
        description:
          "Profile ID is not available. Please refresh the page and try again.",
        variant: "destructive",
      });
      return;
    }

    // Check if any changes were actually made
    if (!hasChanges()) {
      setIsEditing(false);
      return;
    }

    try {
      // Only send the fields that were actually changed
      const changedFields: {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string;
        country?: string;
      } = {};

      const editableFields = [
        "firstName",
        "lastName",
        "phoneNumber",
        "country",
      ] as const;

      editableFields.forEach((field) => {
        const originalValue = profile[field] || "";
        const editedValue = editedProfile[field] || "";
        if (originalValue !== editedValue) {
          changedFields[field] = editedValue;
        }
      });

      const valuesToValidate = {
        firstName: (editedProfile.firstName ?? profile.firstName ?? "").toString(),
        lastName: (editedProfile.lastName ?? profile.lastName ?? "").toString(),
        country: (editedProfile.country ?? profile.country ?? "").toString(),
        phoneNumber: (editedProfile.phoneNumber ?? profile.phoneNumber ?? "").toString(),
      };

      const parsed = profileValidationSchema.safeParse(valuesToValidate);
      if (!parsed.success) {
        const nextErrors: Partial<
          Record<"firstName" | "lastName" | "country" | "phoneNumber", string>
        > = {};
        for (const issue of parsed.error.issues) {
          const field = issue.path[0];
          if (
            field === "firstName" ||
            field === "lastName" ||
            field === "country" ||
            field === "phoneNumber"
          ) {
            nextErrors[field] = issue.message;
          }
        }
        setFormErrors(nextErrors);
        return;
      }

      setFormErrors({});
      if (changedFields.phoneNumber !== undefined) {
        changedFields.phoneNumber = parsed.data.phoneNumber;
      }

      await updateProfile({ id: profile.id, changes: changedFields });

      setIsEditing(false);

      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
        variant: "success",
      });

      // Keep updates in-place (React Query + session update already sync UI).
    } catch (error) {
      console.error("Error updating profile:", error);

      toast({
        title: "Update failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setEditedProfile((prev) => ({
      ...prev,
      [field]: value,
    }));
    if (
      field === "firstName" ||
      field === "lastName" ||
      field === "country" ||
      field === "phoneNumber"
    ) {
      setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const hasProfileData = !!profile;

  // Avoid UI flash after save: session/update can briefly go through "loading"
  // while we still have usable cached profile data.
  if ((status === "loading" || isLoading) && !hasProfileData) {
    return <ProfileSkeleton />;
  }

  if (!session && !hasProfileData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center dark:backdrop-blur-lg dark:bg-white/10 p-8 rounded-xl shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
          <p className="dark:text-gray-200 text-gray-800 mb-2">
            Please sign in to view your profile
          </p>
        </div>
      </div>
    );
  }

  if (error && !hasProfileData) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center dark:backdrop-blur-lg dark:bg-white/10 p-8 rounded-xl shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
          <p className="dark:text-gray-200 text-gray-800 mb-2">
            Failed to load profile
          </p>
          <p className="text-sm dark:text-gray-300 text-gray-600">
            Email: {session?.user?.email}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-center dark:backdrop-blur-lg dark:bg-white/10 p-8 rounded-xl shadow-lg dark:border dark:border-white/10 bg-white border border-gray-200">
          <p className="dark:text-gray-200 text-gray-800 mb-2">
            Profile not found
          </p>
          <p className="text-sm dark:text-gray-300 text-gray-600">
            Email: {session?.user?.email}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProfileContent
      profile={profile}
      isEditing={isEditing}
      editedProfile={editedProfile}
      onEdit={handleEdit}
      onSave={handleSave}
      onCancel={handleCancel}
      onInputChange={handleInputChange}
      isUpdating={isUpdating}
      formErrors={formErrors}
    />
  );
}
