// src/components/dashboardComponents/AddLeadDialog.tsx
"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Loader2, Plus, AlertCircle, Trash2 } from "lucide-react";
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
import { invalidateAndRefetchLeadLists } from "@/lib/leadsListQuerySync";
import { useToast } from "@/components/ui/use-toast";
import { useStatuses } from "@/context/StatusContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import {
  leadFilterKeys,
  LEAD_FILTER_OPTIONS_GC_MS,
  LEAD_FILTER_OPTIONS_STALE_MS,
} from "@/lib/leadFilterQueries";
import {
  formatLeadDetailSource,
  isProvidedLeadSource,
  MANUAL_SOURCE_SELECT_VALUE,
  normalizeLeadSource,
} from "@/lib/leadDisplayFormat";
import {
  MAX_LEAD_CONTACT_EXTRAS,
  type LeadContactEntry,
} from "@/lib/leadContactEntries";
import { isCheckablePhone, phoneDigitsOnly } from "@/lib/phoneCheck";

const SOURCE_SELECT_ITEM_CLASS =
  "focus:bg-[color-mix(in_srgb,var(--brand-from)_14%,white)] focus:text-(--brand-from)! data-[state=checked]:bg-[color-mix(in_srgb,var(--brand-from)_14%,white)] data-[state=checked]:text-(--brand-from)! dark:focus:bg-[color-mix(in_srgb,var(--brand-from)_28%,#111827)] dark:data-[state=checked]:bg-[color-mix(in_srgb,var(--brand-from)_28%,#111827)]";

interface AddLeadFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  source: string;
  status: string;
  emails?: LeadContactEntry[];
  phones?: LeadContactEntry[];
}

const emptyContactEntry = (): LeadContactEntry => ({ value: "", label: "" });

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
  const [extraEmailErrors, setExtraEmailErrors] = useState<
    Record<number, string>
  >({});
  const [checkingExtraEmailIndex, setCheckingExtraEmailIndex] = useState<
    number | null
  >(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [isCheckingPhone, setIsCheckingPhone] = useState(false);
  const [extraPhoneErrors, setExtraPhoneErrors] = useState<
    Record<number, string>
  >({});
  const [checkingExtraPhoneIndex, setCheckingExtraPhoneIndex] = useState<
    number | null
  >(null);
  const [sourceSelectValue, setSourceSelectValue] = useState("");
  const [manualSource, setManualSource] = useState("");
  const [extraEmails, setExtraEmails] = useState<LeadContactEntry[]>([]);
  const [extraPhones, setExtraPhones] = useState<LeadContactEntry[]>([]);

  const { statuses, isLoading: isLoadingStatuses } = useStatuses();
  const defaultStatusId = statuses[0]?._id || statuses[0]?.id || "NEW";

  const {
    data: fetchedSources = [],
    isLoading: isLoadingSources,
    refetch: refetchSources,
  } = useQuery<string[]>({
    queryKey: [...leadFilterKeys.sources()],
    queryFn: async () => {
      const response = await apiCallWithSessionRefresh("/api/leads/sources", {
        cache: "no-store",
        timeoutMs: 15_000,
      });
      if (!response.ok) throw new Error("Failed to fetch sources");
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: LEAD_FILTER_OPTIONS_STALE_MS,
    gcTime: LEAD_FILTER_OPTIONS_GC_MS,
    refetchOnWindowFocus: false,
    // Stay subscribed while mounted so import/create filter invalidation
    // updates this list without a page refresh (same key as SourceFilter).
    refetchOnMount: true,
    placeholderData: (previous) => previous,
  });

  React.useEffect(() => {
    if (!isOpen) return;
    void refetchSources();
  }, [isOpen, refetchSources]);

  const existingSources = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const raw of fetchedSources) {
      const display = formatLeadDetailSource(raw);
      if (!display) continue;
      // Dedicated "Manual Entry" option above — exclude DB copies.
      if (display.toLowerCase() === "manual entry") continue;
      const key = display.toLowerCase();
      if (!byKey.has(key)) byKey.set(key, display);
    }
    return Array.from(byKey.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [fetchedSources]);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
    setValue,
    setError,
    clearErrors,
    watch,
  } = useForm<AddLeadFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "",
      source: "",
      status: defaultStatusId,
    },
  });

  const selectedStatus = watch("status");
  const isManualSource = sourceSelectValue === MANUAL_SOURCE_SELECT_VALUE;

  const resolveSource = () =>
    (isManualSource ? manualSource : sourceSelectValue).trim();

  const ensureSourceValid = (): boolean => {
    const resolved = resolveSource();
    if (isProvidedLeadSource(resolved)) {
      setValue("source", resolved, { shouldValidate: false });
      clearErrors("source");
      return true;
    }
    setValue("source", "", { shouldValidate: false });
    setError("source", {
      type: "required",
      message: isManualSource ? "Enter a source name" : "Source is required",
    });
    return false;
  };

  React.useEffect(() => {
    if (statuses.length > 0 && !selectedStatus) {
      setValue("status", defaultStatusId);
    }
  }, [statuses, selectedStatus, setValue, defaultStatusId]);

  const resetForm = () => {
    reset({
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      country: "",
      source: "",
      status: defaultStatusId,
    });
    setSourceSelectValue("");
    setManualSource("");
    setExtraEmails([]);
    setExtraPhones([]);
    clearErrors("source");
    setEmailError(null);
    setIsCheckingEmail(false);
    setExtraEmailErrors({});
    setCheckingExtraEmailIndex(null);
    setPhoneError(null);
    setIsCheckingPhone(false);
    setExtraPhoneErrors({});
    setCheckingExtraPhoneIndex(null);
  };

  const handleSourceSelectChange = (value: string) => {
    setSourceSelectValue(value);
    if (value === MANUAL_SOURCE_SELECT_VALUE) {
      setValue("source", manualSource.trim(), { shouldValidate: false });
      clearErrors("source");
      return;
    }
    setManualSource("");
    setValue("source", value, { shouldValidate: false });
    clearErrors("source");
  };

  const lookupEmailInDatabase = async (
    email: string,
  ): Promise<{ exists: boolean; leadName?: string }> => {
    const response = await fetch(
      `/api/leads/check-email?email=${encodeURIComponent(email)}`,
      { credentials: "include" },
    );
    if (!response.ok) throw new Error("Failed to check email");
    const data = (await response.json()) as {
      exists?: boolean;
      lead?: { name?: string };
    };
    if (data.exists) {
      return { exists: true, leadName: data.lead?.name };
    }
    return { exists: false };
  };

  const checkEmailExists = async (email: string) => {
    if (!email || !email.includes("@")) {
      setEmailError(null);
      return false;
    }

    setIsCheckingEmail(true);
    setEmailError(null);

    try {
      const result = await lookupEmailInDatabase(email);
      if (result.exists) {
        setEmailError(
          `This email already exists for ${result.leadName ?? "another lead"}. Please use a different email.`,
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking email:", error);
      return false;
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const clearExtraEmailError = (index: number) => {
    setExtraEmailErrors((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const checkExtraEmailExists = async (index: number, email: string) => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !normalized.includes("@")) {
      clearExtraEmailError(index);
      return false;
    }

    const primary = String(watch("email") || "")
      .trim()
      .toLowerCase();
    if (primary && normalized === primary) {
      setExtraEmailErrors((prev) => ({
        ...prev,
        [index]:
          "This is already the primary email — use a different address",
      }));
      return true;
    }

    const duplicateIndex = extraEmails.findIndex(
      (entry, i) =>
        i !== index && entry.value.trim().toLowerCase() === normalized,
    );
    if (duplicateIndex >= 0) {
      setExtraEmailErrors((prev) => ({
        ...prev,
        [index]: "This email is already listed above",
      }));
      return true;
    }

    setCheckingExtraEmailIndex(index);
    clearExtraEmailError(index);

    try {
      const result = await lookupEmailInDatabase(normalized);
      if (result.exists) {
        setExtraEmailErrors((prev) => ({
          ...prev,
          [index]: `This email already exists for ${result.leadName ?? "another lead"}. Please use a different email.`,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking extra email:", error);
      return false;
    } finally {
      setCheckingExtraEmailIndex((current) =>
        current === index ? null : current,
      );
    }
  };

  const lookupPhoneInDatabase = async (
    phone: string,
  ): Promise<{ exists: boolean; leadName?: string }> => {
    const response = await fetch(
      `/api/leads/check-phone?phone=${encodeURIComponent(phone)}`,
      { credentials: "include" },
    );
    if (!response.ok) throw new Error("Failed to check phone");
    const data = (await response.json()) as {
      exists?: boolean;
      lead?: { name?: string };
    };
    if (data.exists) {
      return { exists: true, leadName: data.lead?.name };
    }
    return { exists: false };
  };

  const checkPhoneExists = async (phone: string) => {
    if (!isCheckablePhone(phone)) {
      setPhoneError(null);
      return false;
    }

    setIsCheckingPhone(true);
    setPhoneError(null);

    try {
      const result = await lookupPhoneInDatabase(phone);
      if (result.exists) {
        setPhoneError(
          `This phone already exists for ${result.leadName ?? "another lead"}. Please use a different number.`,
        );
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking phone:", error);
      return false;
    } finally {
      setIsCheckingPhone(false);
    }
  };

  const clearExtraPhoneError = (index: number) => {
    setExtraPhoneErrors((prev) => {
      if (!(index in prev)) return prev;
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const checkExtraPhoneExists = async (index: number, phone: string) => {
    if (!isCheckablePhone(phone)) {
      clearExtraPhoneError(index);
      return false;
    }

    const digits = phoneDigitsOnly(phone);
    const primaryDigits = phoneDigitsOnly(watch("phone") || "");
    if (primaryDigits && digits === primaryDigits) {
      setExtraPhoneErrors((prev) => ({
        ...prev,
        [index]:
          "This is already the primary phone — use a different number",
      }));
      return true;
    }

    const duplicateIndex = extraPhones.findIndex(
      (entry, i) =>
        i !== index &&
        isCheckablePhone(entry.value) &&
        phoneDigitsOnly(entry.value) === digits,
    );
    if (duplicateIndex >= 0) {
      setExtraPhoneErrors((prev) => ({
        ...prev,
        [index]: "This phone is already listed above",
      }));
      return true;
    }

    setCheckingExtraPhoneIndex(index);
    clearExtraPhoneError(index);

    try {
      const result = await lookupPhoneInDatabase(phone);
      if (result.exists) {
        setExtraPhoneErrors((prev) => ({
          ...prev,
          [index]: `This phone already exists for ${result.leadName ?? "another lead"}. Please use a different number.`,
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error checking extra phone:", error);
      return false;
    } finally {
      setCheckingExtraPhoneIndex((current) =>
        current === index ? null : current,
      );
    }
  };

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
    onSuccess: async (_result, variables) => {
      const savedSource = normalizeLeadSource(variables.source);
      if (isProvidedLeadSource(savedSource)) {
        queryClient.setQueryData<string[]>(
          [...leadFilterKeys.sources()],
          (prev) => {
            const list = Array.isArray(prev) ? prev : [];
            const key = savedSource.toLowerCase();
            if (list.some((s) => s.toLowerCase() === key)) return list;
            return [...list, savedSource].sort((a, b) =>
              a.localeCompare(b, undefined, { sensitivity: "base" }),
            );
          },
        );
      }

      // Invalidate alone is not enough: all-leads uses refetchOnMount:false +
      // placeholderData, so force a refetch so the new row appears immediately.
      await invalidateAndRefetchLeadLists(queryClient);

      toast({
        title: "Success!",
        description: "Lead created successfully",
        variant: "success",
      });

      resetForm();
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
    if (!ensureSourceValid()) return;

    const emailExists = await checkEmailExists(data.email);
    if (emailExists) {
      toast({
        title: "Duplicate Email",
        description: "A lead with this email already exists.",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < extraEmails.length; i++) {
      const value = extraEmails[i]?.value?.trim() ?? "";
      if (!value) continue;
      const extraExists = await checkExtraEmailExists(i, value);
      if (extraExists) {
        toast({
          title: "Duplicate Email",
          description: `Email ${i + 2} is already in use. Please use a different email.`,
          variant: "destructive",
        });
        return;
      }
    }

    const phoneExists = await checkPhoneExists(data.phone);
    if (phoneExists) {
      toast({
        title: "Duplicate Phone",
        description: "A lead with this phone number already exists.",
        variant: "destructive",
      });
      return;
    }

    for (let i = 0; i < extraPhones.length; i++) {
      const value = extraPhones[i]?.value?.trim() ?? "";
      if (!value) continue;
      const extraExists = await checkExtraPhoneExists(i, value);
      if (extraExists) {
        toast({
          title: "Duplicate Phone",
          description: `Phone ${i + 2} is already in use. Please use a different number.`,
          variant: "destructive",
        });
        return;
      }
    }

    createLeadMutation.mutate({
      ...data,
      source: normalizeLeadSource(resolveSource()),
      emails: extraEmails,
      phones: extraPhones,
    });
  };

  const hasExtraEmailErrors = Object.keys(extraEmailErrors).length > 0;
  const hasExtraPhoneErrors = Object.keys(extraPhoneErrors).length > 0;
  const isValidatingContacts =
    isCheckingEmail ||
    checkingExtraEmailIndex !== null ||
    isCheckingPhone ||
    checkingExtraPhoneIndex !== null;

  const handleClose = () => {
    if (!createLeadMutation.isPending && !isValidatingContacts) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
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

        <form
          onSubmit={handleSubmit(onSubmit, () => {
            ensureSourceValid();
          })}
          className="space-y-4"
        >
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

          <div className="space-y-2">
            <Label htmlFor="lastName">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              placeholder="Doe"
              {...register("lastName", {
                required: "Last name is required",
              })}
              disabled={createLeadMutation.isPending}
              className={errors.lastName ? "border-red-500" : ""}
            />
            {errors.lastName && (
              <p className="text-sm text-red-500">{errors.lastName.message}</p>
            )}
          </div>

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

            {extraEmails.map((entry, index) => {
              const extraError = extraEmailErrors[index];
              const isCheckingExtra = checkingExtraEmailIndex === index;
              return (
                <div
                  key={`add-email-extra-${index}`}
                  className="flex items-start gap-2"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor={`extra-email-${index}`}>
                        {entry.label
                          ? `Email (${entry.label})`
                          : `Email ${index + 2}`}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`extra-email-${index}`}
                          type="email"
                          placeholder="another@example.com"
                          value={entry.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            clearExtraEmailError(index);
                            setExtraEmails((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], value };
                              return next;
                            });
                          }}
                          onBlur={(e) =>
                            void checkExtraEmailExists(index, e.target.value)
                          }
                          disabled={
                            createLeadMutation.isPending || isCheckingExtra
                          }
                          className={
                            extraError
                              ? "border-red-500 pr-10"
                              : isCheckingExtra
                                ? "pr-10"
                                : ""
                          }
                        />
                        {isCheckingExtra && (
                          <div className="absolute -translate-y-1/2 right-3 top-1/2">
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          </div>
                        )}
                      </div>
                      {extraError && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>{extraError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Input
                      value={entry.label || ""}
                      onChange={(e) => {
                        const label = e.target.value;
                        setExtraEmails((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], label };
                          return next;
                        });
                      }}
                      placeholder="Label (optional, e.g. Work)"
                      disabled={createLeadMutation.isPending}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExtraEmails((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                      setExtraEmailErrors((prev) => {
                        const next: Record<number, string> = {};
                        for (const [key, message] of Object.entries(prev)) {
                          const i = Number(key);
                          if (i < index) next[i] = message;
                          else if (i > index) next[i - 1] = message;
                        }
                        return next;
                      });
                      setCheckingExtraEmailIndex((current) => {
                        if (current == null) return null;
                        if (current === index) return null;
                        if (current > index) return current - 1;
                        return current;
                      });
                    }}
                    disabled={createLeadMutation.isPending}
                    className="mt-7 p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Remove email"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {extraEmails.length < MAX_LEAD_CONTACT_EXTRAS && (
              <button
                type="button"
                onClick={() =>
                  setExtraEmails((prev) => [...prev, emptyContactEntry()])
                }
                disabled={createLeadMutation.isPending}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-(--brand-from) hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add email
              </button>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="+1 234 567 8900"
                {...register("phone", {
                  required: "Phone number is required",
                  onChange: () => setPhoneError(null),
                  onBlur: (e) => void checkPhoneExists(e.target.value),
                })}
                disabled={createLeadMutation.isPending || isCheckingPhone}
                className={
                  errors.phone || phoneError
                    ? "border-red-500 pr-10"
                    : isCheckingPhone
                      ? "pr-10"
                      : ""
                }
              />
              {isCheckingPhone && (
                <div className="absolute -translate-y-1/2 right-3 top-1/2">
                  <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                </div>
              )}
            </div>
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone.message}</p>
            )}
            {phoneError && !errors.phone && (
              <Alert variant="destructive" className="mt-2">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{phoneError}</AlertDescription>
              </Alert>
            )}

            {extraPhones.map((entry, index) => {
              const extraError = extraPhoneErrors[index];
              const isCheckingExtra = checkingExtraPhoneIndex === index;
              return (
                <div
                  key={`add-phone-extra-${index}`}
                  className="flex items-start gap-2"
                >
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="space-y-1">
                      <Label htmlFor={`extra-phone-${index}`}>
                        {entry.label
                          ? `Phone (${entry.label})`
                          : `Phone ${index + 2}`}
                      </Label>
                      <div className="relative">
                        <Input
                          id={`extra-phone-${index}`}
                          type="tel"
                          placeholder="+1 234 567 8901"
                          value={entry.value}
                          onChange={(e) => {
                            const value = e.target.value;
                            clearExtraPhoneError(index);
                            setExtraPhones((prev) => {
                              const next = [...prev];
                              next[index] = { ...next[index], value };
                              return next;
                            });
                          }}
                          onBlur={(e) =>
                            void checkExtraPhoneExists(index, e.target.value)
                          }
                          disabled={
                            createLeadMutation.isPending || isCheckingExtra
                          }
                          className={
                            extraError
                              ? "border-red-500 pr-10"
                              : isCheckingExtra
                                ? "pr-10"
                                : ""
                          }
                        />
                        {isCheckingExtra && (
                          <div className="absolute -translate-y-1/2 right-3 top-1/2">
                            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
                          </div>
                        )}
                      </div>
                      {extraError && (
                        <Alert variant="destructive" className="mt-2">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>{extraError}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                    <Input
                      value={entry.label || ""}
                      onChange={(e) => {
                        const label = e.target.value;
                        setExtraPhones((prev) => {
                          const next = [...prev];
                          next[index] = { ...next[index], label };
                          return next;
                        });
                      }}
                      placeholder="Label (optional, e.g. Mobile)"
                      disabled={createLeadMutation.isPending}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setExtraPhones((prev) =>
                        prev.filter((_, i) => i !== index),
                      );
                      setExtraPhoneErrors((prev) => {
                        const next: Record<number, string> = {};
                        for (const [key, message] of Object.entries(prev)) {
                          const i = Number(key);
                          if (i < index) next[i] = message;
                          else if (i > index) next[i - 1] = message;
                        }
                        return next;
                      });
                      setCheckingExtraPhoneIndex((current) => {
                        if (current == null) return null;
                        if (current === index) return null;
                        if (current > index) return current - 1;
                        return current;
                      });
                    }}
                    disabled={createLeadMutation.isPending}
                    className="mt-7 p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Remove phone"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}

            {extraPhones.length < MAX_LEAD_CONTACT_EXTRAS && (
              <button
                type="button"
                onClick={() =>
                  setExtraPhones((prev) => [...prev, emptyContactEntry()])
                }
                disabled={createLeadMutation.isPending}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-(--brand-from) hover:underline"
              >
                <Plus className="w-4 h-4" />
                Add phone
              </button>
            )}
          </div>

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

          <div className="space-y-2">
            <Label htmlFor="source">
              Source <span className="text-red-500">*</span>
            </Label>
            <Select
              value={sourceSelectValue || undefined}
              onValueChange={handleSourceSelectChange}
              disabled={createLeadMutation.isPending || isLoadingSources}
            >
              <SelectTrigger
                id="source"
                className={
                  errors.source && !isManualSource ? "border-red-500" : ""
                }
                aria-invalid={Boolean(errors.source && !isManualSource)}
              >
                <SelectValue
                  placeholder={
                    isLoadingSources ? "Loading sources..." : "Select a source"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  value={MANUAL_SOURCE_SELECT_VALUE}
                  className={SOURCE_SELECT_ITEM_CLASS}
                >
                  Manual Entry
                </SelectItem>
                {existingSources.map((source) => (
                  <SelectItem
                    key={source}
                    value={source}
                    className={SOURCE_SELECT_ITEM_CLASS}
                  >
                    {source}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isManualSource && (
              <Input
                id="manualSource"
                placeholder="Type a source name"
                value={manualSource}
                onChange={(e) => {
                  const next = e.target.value;
                  setManualSource(next);
                  setValue("source", next, { shouldValidate: false });
                  if (isProvidedLeadSource(next)) clearErrors("source");
                }}
                disabled={createLeadMutation.isPending}
                className={errors.source ? "border-red-500" : ""}
                autoFocus
              />
            )}
            {errors.source && (
              <p className="text-sm text-red-500">{errors.source.message}</p>
            )}
          </div>

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
                    isLoadingStatuses
                      ? "Loading statuses..."
                      : "Select a status"
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
                createLeadMutation.isPending ||
                isValidatingContacts ||
                !!emailError ||
                hasExtraEmailErrors ||
                !!phoneError ||
                hasExtraPhoneErrors
              }
              className="text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              {createLeadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : isValidatingContacts ? (
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
