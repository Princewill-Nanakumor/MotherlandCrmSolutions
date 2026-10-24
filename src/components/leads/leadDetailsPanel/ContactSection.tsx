// src/components/leads/leadDetailsPanel/ContactSection.tsx
import { FC, useState, useCallback } from "react";
import {
  ChevronUp,
  ChevronDown,
  Edit2,
  Save,
  X,
  Copy,
  Check,
  Tag,
  Plus,
  Trash2,
} from "lucide-react";
import { Lead, type LeadContactEntry } from "@/types/leads";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EDIT_ICON_BUTTON_CLASS } from "@/lib/actionIconButtonStyles";
import { NameField } from "./NameField";
import { EmailField } from "./EmailField";
import { PhoneField } from "./PhoneField";
import { CountryField } from "./CountryField";
import { useDialerSettings } from "@/context/DialerSettingsContext";
import { useCurrentUserPermission } from "@/hooks/useCurrentUserPermission";
import { useQueryClient } from "@tanstack/react-query";
import { callLogsKeys } from "@/components/user-management/CallLogsModal";
import { normalizePhoneForDialer } from "@/lib/phoneNormalize";
import { isMaskedContactValue } from "@/lib/contactMasking";
import { apiCallWithSessionRefresh } from "@/lib/apiUtils";
import {
  buildDialerProtocolUrl,
  buildTelUrl,
  openExternalDialerUrl,
} from "@/lib/openDialerUrl";
import { formatLeadDetailSource } from "@/lib/leadDisplayFormat";
import { canEditLead } from "@/lib/roles";
import {
  MAX_LEAD_CONTACT_EXTRAS,
  coerceContactEntries,
  normalizeEmailEntries,
  normalizePhoneEntries,
} from "@/lib/leadContactEntries";

async function writeTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

interface ContactSectionProps {
  lead: Lead | null;
  isExpanded: boolean;
  onToggle: () => void;
  onLeadUpdated?: (updatedLead: Lead) => Promise<boolean>;
}

export const ContactSection: FC<ContactSectionProps> = ({
  lead,
  isExpanded,
  onToggle,
  onLeadUpdated,
}) => {
  const { toast } = useToast();
  const { data: session } = useSession();
  const { dialer } = useDialerSettings();
  const queryClient = useQueryClient();
  const canEditContact = canEditLead(session?.user);
  const { canViewPhoneNumbers, canViewEmails, isLoading: isLoadingPermission } =
    useCurrentUserPermission();
  const shouldMaskEmail = !canViewEmails;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isResolvingCall, setIsResolvingCall] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Edit form state
  const [editedData, setEditedData] = useState({
    firstName: lead?.firstName || "",
    lastName: lead?.lastName || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    country: lead?.country || "",
    source: lead?.source || "",
    emails: coerceContactEntries(lead?.emails),
    phones: coerceContactEntries(lead?.phones),
  });

  const handleCopy = useCallback(
    async (text: string, field: string) => {
      const value = text.trim();
      if (!value) {
        toast({
          variant: "destructive",
          description: "Nothing to copy",
        });
        return;
      }
      const ok = await writeTextToClipboard(value);
      if (!ok) {
        toast({
          variant: "destructive",
          description: "Failed to copy to clipboard",
        });
        return;
      }
      setCopiedField(field);
      const label =
        field === "leadId"
          ? "Lead ID"
          : field === "name"
            ? "Name"
            : field.startsWith("email")
              ? "Email"
              : field.startsWith("phone")
                ? "Phone number"
                : field === "country"
                  ? "Country"
                  : field === "source"
                    ? "Source"
                    : "Value";
      toast({
        description: `${label} copied to clipboard`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    },
    [toast],
  );

  const resolvePhoneForDial = useCallback(
    async (preferred?: string): Promise<string | null> => {
      if (preferred) {
        const fromPreferred = normalizePhoneForDialer(
          preferred,
          lead?.country,
        );
        if (fromPreferred && !isMaskedContactValue(fromPreferred)) {
          return fromPreferred;
        }
      }

      const fromLead = normalizePhoneForDialer(
        lead?.phone ?? "",
        lead?.country,
      );
      if (fromLead && !isMaskedContactValue(fromLead)) {
        return fromLead;
      }

      if (!lead?._id) return null;

      try {
        const response = await apiCallWithSessionRefresh(
          `/api/leads/${lead._id}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );
        if (!response.ok) return null;

        const data = (await response.json()) as Lead;
        if (preferred) {
          const match =
            data.phones?.find(
              (p) =>
                p.value.replace(/\D/g, "") === preferred.replace(/\D/g, ""),
            )?.value ?? preferred;
          const fromExtra = normalizePhoneForDialer(
            match,
            data.country ?? lead.country,
          );
          if (fromExtra && !isMaskedContactValue(fromExtra)) return fromExtra;
        }
        const fromDetail = normalizePhoneForDialer(
          data.phone ?? "",
          data.country ?? lead.country,
        );
        if (!fromDetail || isMaskedContactValue(fromDetail)) return null;
        return fromDetail;
      } catch {
        return null;
      }
    },
    [lead],
  );

  const handleCall = useCallback(
    async (phoneNumber?: string) => {
      if (isResolvingCall) return;

      setIsResolvingCall(true);
      try {
        let cleanedNumber =
          (await resolvePhoneForDial(phoneNumber)) ?? "";

        if (!cleanedNumber) {
          toast({
            variant: "destructive",
            description: "Could not load phone number. Try again in a moment.",
          });
          return;
        }

        // Ensure the number starts with + for international format
        if (!cleanedNumber.startsWith("+")) {
          if (cleanedNumber.startsWith("00")) {
            cleanedNumber = "+" + cleanedNumber.substring(2);
          } else if (
            cleanedNumber.startsWith("1") &&
            cleanedNumber.length === 11
          ) {
            cleanedNumber = "+" + cleanedNumber;
          }
        }

        if (!dialer) {
          openExternalDialerUrl(buildTelUrl(cleanedNumber));
          try {
            const response = await fetch("/api/calls/log", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                leadId: lead?._id || null,
                phoneNumber: cleanedNumber,
                dialer: "tel",
              }),
            });
            if (response.ok && lead?._id) {
              void queryClient.invalidateQueries({
                queryKey: ["activities", lead._id],
                refetchType: "active",
              });
            }
          } catch {
            /* ignore */
          }
          return;
        }

        openExternalDialerUrl(buildDialerProtocolUrl(dialer, cleanedNumber));

        // Log the call attempt to the database
        try {
          const response = await fetch("/api/calls/log", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              leadId: lead?._id || null,
              phoneNumber: cleanedNumber,
              dialer: dialer,
            }),
          });

          if (response.ok) {
            if (lead?._id) {
              void queryClient.invalidateQueries({
                queryKey: ["activities", lead._id],
                refetchType: "active",
              });
            }
            // Invalidate call logs for the current user who made the call
            // React Query will automatically refetch any active queries (if modal is open)
            // This ensures the call logs modal shows the latest data immediately without page refresh
            if (session?.user?.id) {
              queryClient.invalidateQueries({
                queryKey: callLogsKeys.user(session.user.id),
                refetchType: "active", // Only refetch if query is currently being used (modal is open)
              });
            }
          }
        } catch (logError) {
          // Silently fail if logging fails - don't interrupt the user experience
          console.error("Failed to log call:", logError);
        }
      } catch (error) {
        console.error("Error initiating call:", error);
      } finally {
        setIsResolvingCall(false);
      }
    },
    [
      dialer,
      lead,
      session?.user?.id,
      queryClient,
      toast,
      isResolvingCall,
      resolvePhoneForDial,
    ],
  );

  const syncEditedFromLead = useCallback((current: Lead) => {
    setEditedData({
      firstName: current.firstName || "",
      lastName: current.lastName || "",
      email: current.email || "",
      phone: current.phone || "",
      country: current.country || "",
      source: current.source || "",
      emails: coerceContactEntries(current.emails),
      phones: coerceContactEntries(current.phones),
    });
  }, []);

  const handleEdit = useCallback(() => {
    if (lead) {
      syncEditedFromLead(lead);
      setIsEditing(true);
    }
  }, [lead, syncEditedFromLead]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    if (lead) syncEditedFromLead(lead);
  }, [lead, syncEditedFromLead]);

  const handleRemoveEmail = useCallback(
    (index: number) => {
      setEditedData((prev) => ({
        ...prev,
        emails: prev.emails.filter((_, i) => i !== index),
      }));
      toast({
        variant: "success",
        description: "Email removed successfully",
      });
    },
    [toast],
  );

  const handleRemovePhone = useCallback(
    (index: number) => {
      setEditedData((prev) => ({
        ...prev,
        phones: prev.phones.filter((_, i) => i !== index),
      }));
      toast({
        variant: "success",
        description: "Phone number removed successfully",
      });
    },
    [toast],
  );

  const handleSave = useCallback(async () => {
    if (!lead || !onLeadUpdated) {
      return;
    }

    if (!editedData.firstName.trim()) {
      toast({
        variant: "destructive",
        description: "First name is required",
      });
      return;
    }

    if (!editedData.email.trim()) {
      toast({
        variant: "destructive",
        description: "Email is required",
      });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedData.email)) {
      toast({
        variant: "destructive",
        description: "Please enter a valid email address",
      });
      return;
    }

    const primaryPhone =
      normalizePhoneForDialer(editedData.phone, editedData.country) ||
      editedData.phone.trim();

    let emails: LeadContactEntry[];
    let phones: LeadContactEntry[];
    try {
      emails = normalizeEmailEntries(editedData.emails, editedData.email);
      phones = normalizePhoneEntries(
        editedData.phones.map((p) => ({
          ...p,
          value:
            normalizePhoneForDialer(p.value, editedData.country) ||
            p.value.trim(),
        })),
        primaryPhone,
      );
    } catch (err) {
      toast({
        variant: "destructive",
        description:
          err instanceof Error ? err.message : "Invalid contact details",
      });
      return;
    }

    setIsSaving(true);

    try {
      const updatedLead: Lead = {
        ...lead,
        firstName: editedData.firstName.trim(),
        lastName: editedData.lastName.trim(),
        email: editedData.email.trim().toLowerCase(),
        phone: primaryPhone,
        emails,
        phones,
        country: editedData.country.trim(),
        source: editedData.source?.trim(),
      };

      const result = await onLeadUpdated(updatedLead);

      if (result) {
        setIsEditing(false);
        setTimeout(() => {
          toast({
            variant: "success",
            description: "Contact information updated successfully",
          });
        }, 100);
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      console.error("Error updating contact info:", error);
      toast({
        variant: "destructive",
        description:
          error instanceof Error
            ? error.message
            : "Failed to update contact information",
      });
    } finally {
      setIsSaving(false);
    }
  }, [lead, editedData, onLeadUpdated, toast]);

  if (!lead) return null;

  return (
    <div className="overflow-hidden bg-white border border-gray-200 dark:bg-gray-800 rounded-xl dark:border-gray-700">
      <div
        className="flex items-center justify-between p-4 cursor-pointer group"
        onClick={onToggle}
      >
        <h3 className="font-medium text-gray-900! dark:text-white!">
          Contact Information
        </h3>
        <div className="flex items-center gap-2">
          {canEditContact && isExpanded && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              title="Edit contact"
              className={`h-8 px-2 transition-opacity duration-200 opacity-100 md:opacity-0 md:group-hover:opacity-100 ${EDIT_ICON_BUTTON_CLASS}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </div>
      </div>

      {/* Content with smooth height transition */}
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
          isExpanded
            ? "grid-rows-[1fr] opacity-100"
            : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="px-4 pb-4 space-y-3">
            {isEditing ? (
            // Edit Mode
            <>
              <div className="space-y-3">
                <NameField
                  firstName={lead.firstName}
                  lastName={lead.lastName}
                  isEditing={true}
                  editedFirstName={editedData.firstName}
                  editedLastName={editedData.lastName}
                  onFirstNameChange={(value) =>
                    setEditedData({ ...editedData, firstName: value })
                  }
                  onLastNameChange={(value) =>
                    setEditedData({ ...editedData, lastName: value })
                  }
                />

                <EmailField
                  email={lead.email}
                  isEditing={true}
                  editedEmail={editedData.email}
                  onEmailChange={(value) =>
                    setEditedData({ ...editedData, email: value })
                  }
                  label="Email"
                  required
                />

                {editedData.emails.map((entry, index) => (
                  <div key={`email-extra-${index}`} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-2">
                      <EmailField
                        email={entry.value}
                        isEditing={true}
                        editedEmail={entry.value}
                        onEmailChange={(value) => {
                          const next = [...editedData.emails];
                          next[index] = { ...next[index], value };
                          setEditedData({ ...editedData, emails: next });
                        }}
                        label={
                          entry.label
                            ? `Email (${entry.label})`
                            : `Email ${index + 2}`
                        }
                        required={false}
                      />
                      <Input
                        value={entry.label || ""}
                        onChange={(e) => {
                          const next = [...editedData.emails];
                          next[index] = {
                            ...next[index],
                            label: e.target.value,
                          };
                          setEditedData({ ...editedData, emails: next });
                        }}
                        placeholder="Label (optional, e.g. Work)"
                        className="ml-8 w-[calc(100%-2rem)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveEmail(index)}
                      className="mt-8 p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      aria-label="Remove email"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {editedData.emails.length < MAX_LEAD_CONTACT_EXTRAS && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditedData({
                        ...editedData,
                        emails: [...editedData.emails, { value: "", label: "" }],
                      })
                    }
                    className="inline-flex items-center gap-1.5 ml-8 text-sm font-medium text-(--brand-from) hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add email
                  </button>
                )}

                <PhoneField
                  phone={lead.phone}
                  countryHint={lead.country}
                  isEditing={true}
                  editedPhone={editedData.phone}
                  onPhoneChange={(value) =>
                    setEditedData({ ...editedData, phone: value })
                  }
                  canViewPhoneNumbers={canViewPhoneNumbers}
                  isLoadingPermission={isLoadingPermission}
                  label="Phone"
                />

                {editedData.phones.map((entry, index) => (
                  <div key={`phone-extra-${index}`} className="flex items-start gap-2">
                    <div className="flex-1 min-w-0 space-y-2">
                      <PhoneField
                        phone={entry.value}
                        countryHint={editedData.country}
                        isEditing={true}
                        editedPhone={entry.value}
                        onPhoneChange={(value) => {
                          const next = [...editedData.phones];
                          next[index] = { ...next[index], value };
                          setEditedData({ ...editedData, phones: next });
                        }}
                        canViewPhoneNumbers={canViewPhoneNumbers}
                        label={
                          entry.label
                            ? `Phone (${entry.label})`
                            : `Phone ${index + 2}`
                        }
                      />
                      <Input
                        value={entry.label || ""}
                        onChange={(e) => {
                          const next = [...editedData.phones];
                          next[index] = {
                            ...next[index],
                            label: e.target.value,
                          };
                          setEditedData({ ...editedData, phones: next });
                        }}
                        placeholder="Label (optional, e.g. Mobile)"
                        className="ml-8 w-[calc(100%-2rem)]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePhone(index)}
                      className="mt-8 p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      aria-label="Remove phone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                {editedData.phones.length < MAX_LEAD_CONTACT_EXTRAS && (
                  <button
                    type="button"
                    onClick={() =>
                      setEditedData({
                        ...editedData,
                        phones: [...editedData.phones, { value: "", label: "" }],
                      })
                    }
                    className="inline-flex items-center gap-1.5 ml-8 text-sm font-medium text-(--brand-from) hover:underline"
                  >
                    <Plus className="w-4 h-4" />
                    Add phone
                  </button>
                )}

                <CountryField
                  country={lead.country}
                  isEditing={true}
                  editedCountry={editedData.country}
                  onCountryChange={(value) =>
                    setEditedData({ ...editedData, country: value })
                  }
                />

                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 mt-2 text-gray-400! dark:text-gray-500!" />
                  <div className="flex-1">
                    <label className="block mb-1 text-sm text-gray-500! dark:text-gray-400!">
                      Source
                    </label>
                    <Input
                      value={editedData.source}
                      onChange={(e) =>
                        setEditedData({ ...editedData, source: e.target.value })
                      }
                      placeholder="Enter source"
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1"
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  onClick={handleCancel}
                  disabled={isSaving}
                  variant="outline"
                  className="flex-1"
                  size="sm"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            // View Mode
            <>
              {/* Lead ID moved to header */}
              <NameField
                firstName={lead.firstName}
                lastName={lead.lastName}
                isEditing={false}
                editedFirstName=""
                editedLastName=""
                onFirstNameChange={() => {}}
                onLastNameChange={() => {}}
                onCopy={(text) => handleCopy(text, "name")}
                copied={copiedField === "name"}
              />

              <EmailField
                email={lead.email}
                isEditing={false}
                editedEmail=""
                onEmailChange={() => {}}
                maskForDisplay={shouldMaskEmail}
                onCopy={
                  canViewEmails
                    ? (text) => handleCopy(text, "email")
                    : undefined
                }
                copied={canViewEmails ? copiedField === "email" : false}
                label="Email"
              />

              {coerceContactEntries(lead.emails).map((entry, index) => (
                <EmailField
                  key={`view-email-${index}-${entry.value}`}
                  email={entry.value}
                  isEditing={false}
                  editedEmail=""
                  onEmailChange={() => {}}
                  maskForDisplay={shouldMaskEmail}
                  onCopy={
                    canViewEmails
                      ? (text) => handleCopy(text, `email-${index}`)
                      : undefined
                  }
                  copied={
                    canViewEmails ? copiedField === `email-${index}` : false
                  }
                  label={
                    entry.label ? `Email (${entry.label})` : `Email ${index + 2}`
                  }
                  required={false}
                />
              ))}

              <PhoneField
                phone={lead.phone}
                countryHint={lead.country}
                isEditing={false}
                editedPhone=""
                onPhoneChange={() => {}}
                onCopy={
                  canViewPhoneNumbers
                    ? (text) => handleCopy(text, "phone")
                    : undefined
                }
                onCall={handleCall}
                isCallLoading={isResolvingCall}
                copied={canViewPhoneNumbers ? copiedField === "phone" : false}
                canViewPhoneNumbers={canViewPhoneNumbers}
                isLoadingPermission={isLoadingPermission}
                label="Phone"
              />

              {coerceContactEntries(lead.phones).map((entry, index) => (
                <PhoneField
                  key={`view-phone-${index}-${entry.value}`}
                  phone={entry.value}
                  countryHint={lead.country}
                  isEditing={false}
                  editedPhone=""
                  onPhoneChange={() => {}}
                  onCopy={
                    canViewPhoneNumbers
                      ? (text) => handleCopy(text, `phone-${index}`)
                      : undefined
                  }
                  onCall={handleCall}
                  isCallLoading={isResolvingCall}
                  copied={
                    canViewPhoneNumbers
                      ? copiedField === `phone-${index}`
                      : false
                  }
                  canViewPhoneNumbers={canViewPhoneNumbers}
                  isLoadingPermission={isLoadingPermission}
                  label={
                    entry.label ? `Phone (${entry.label})` : `Phone ${index + 2}`
                  }
                />
              ))}

              <CountryField
                country={lead.country}
                isEditing={false}
                editedCountry=""
                onCountryChange={() => {}}
                onCopy={(text) => handleCopy(text, "country")}
                copied={copiedField === "country"}
              />

              {lead.source && (
                <div className="flex items-center gap-3 text-gray-700! dark:text-gray-300!">
                  <Tag className="w-5 h-5 text-gray-400! dark:text-gray-500!" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500! dark:text-gray-400!">
                      Source
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-gray-900! dark:text-white!">
                        {formatLeadDetailSource(lead.source)}
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopy(lead.source || "", "source");
                        }}
                        className="ml-2 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                        title="Copy source"
                      >
                        {copiedField === "source" ? (
                          <Check className="w-4 h-4 text-green-500 dark:text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactSection;
