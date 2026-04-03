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
} from "lucide-react";
import { Lead } from "@/types/leads";
import { useToast } from "@/components/ui/use-toast";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NameField } from "./NameField";
import { EmailField } from "./EmailField";
import { PhoneField } from "./PhoneField";
import { CountryField } from "./CountryField";
import { useDialerSettings } from "@/context/DialerSettingsContext";
import { useCurrentUserPermission } from "@/hooks/useCurrentUserPermission";
import { useQueryClient } from "@tanstack/react-query";
import { callLogsKeys } from "@/components/user-management/CallLogsModal";

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
  const isAdmin = session?.user?.role === "ADMIN";
  const { canViewPhoneNumbers, isLoading: isLoadingPermission } =
    useCurrentUserPermission();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<
    "leadId" | "name" | "email" | "phone" | "country" | "source" | null
  >(null);

  // Edit form state
  const [editedData, setEditedData] = useState({
    firstName: lead?.firstName || "",
    lastName: lead?.lastName || "",
    email: lead?.email || "",
    phone: lead?.phone || "",
    country: lead?.country || "",
    source: lead?.source || "",
  });

  const handleCopy = useCallback(
    async (
      text: string,
      field: "leadId" | "name" | "email" | "phone" | "country" | "source"
    ) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        toast({
          description: `${
            field === "leadId"
              ? "Lead ID"
              : field === "name"
                ? "Name"
                : field === "email"
                  ? "Email"
                  : field === "phone"
                    ? "Phone number"
                    : field === "country"
                      ? "Country"
                      : "Source"
          } copied to clipboard`,
        });
        setTimeout(() => setCopiedField(null), 2000);
      } catch {
        toast({
          variant: "destructive",
          description: "Failed to copy to clipboard",
        });
      }
    },
    [toast]
  );

  const handleCall = useCallback(
    async (phoneNumber: string) => {
      try {
        // Clean the phone number: remove spaces, dashes, parentheses, but keep + sign
        let cleanedNumber = phoneNumber.replace(/[\s\-\(\)\.]/g, "").trim();

        if (!cleanedNumber) {
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

        // Check if dialer is set
        if (!dialer) {
          return;
        }

        // Get the dialer URL based on user's preference
        let dialerUrl: string;

        if (dialer === "microsip") {
          // MicroSIP uses sip: protocol
          // Standard SIP URI format: sip:number or sip:number@domain
          // Always use standard format - PBX configuration handles number hiding
          dialerUrl = `sip:${cleanedNumber}`;
        } else {
          // Zoiper uses zoiper:// protocol
          dialerUrl = `zoiper://${cleanedNumber}`;
        }

        // Try to open the selected dialer with the number
        try {
          const link = document.createElement("a");
          link.href = dialerUrl;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          }, 100);
        } catch (err) {
          console.error(`Error with ${dialer}:// protocol:`, err);
        }

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
      }
    },
    [dialer, lead, session?.user?.id, queryClient]
  );

  const handleEdit = useCallback(() => {
    if (lead) {
      setEditedData({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        country: lead.country || "",
        source: lead.source || "",
      });
      setIsEditing(true);
    }
  }, [lead]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    if (lead) {
      setEditedData({
        firstName: lead.firstName || "",
        lastName: lead.lastName || "",
        email: lead.email || "",
        phone: lead.phone || "",
        country: lead.country || "",
        source: lead.source || "",
      });
    }
  }, [lead]);

  const handleSave = useCallback(async () => {
    if (!lead || !onLeadUpdated) {
      return;
    }

    // Validation
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

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editedData.email)) {
      toast({
        variant: "destructive",
        description: "Please enter a valid email address",
      });
      return;
    }

    setIsSaving(true);

    try {
      const updatedLead: Lead = {
        ...lead,
        firstName: editedData.firstName.trim(),
        lastName: editedData.lastName.trim(),
        email: editedData.email.trim(),
        phone: editedData.phone.trim(),
        country: editedData.country.trim(),
        source: editedData.source?.trim(),
      };

      const result = await onLeadUpdated(updatedLead);

      if (result) {
        setIsEditing(false);
        setTimeout(() => {
          toast({
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
          {isAdmin && isExpanded && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleEdit();
              }}
              className="h-8 px-2 transition-opacity duration-200 opacity-0 group-hover:opacity-100"
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

      {/* Content with smooth transition */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
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
                />

                <PhoneField
                  phone={lead.phone}
                  isEditing={true}
                  editedPhone={editedData.phone}
                  onPhoneChange={(value) =>
                    setEditedData({ ...editedData, phone: value })
                  }
                  canViewPhoneNumbers={canViewPhoneNumbers}
                  isLoadingPermission={isLoadingPermission}
                />

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
                onCopy={(text) => handleCopy(text, "email")}
                copied={copiedField === "email"}
              />

              <PhoneField
                phone={lead.phone}
                isEditing={false}
                editedPhone=""
                onPhoneChange={() => {}}
                onCopy={(text) => handleCopy(text, "phone")}
                onCall={dialer ? handleCall : undefined}
                copied={copiedField === "phone"}
                canViewPhoneNumbers={canViewPhoneNumbers}
                isLoadingPermission={isLoadingPermission}
              />

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
                        {lead.source}
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
  );
};

export default ContactSection;
