"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, use, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadHeader } from "@/components/leads/leadDetailsPanel/LeadHeader";
import { ContactSection } from "@/components/leads/leadDetailsPanel/ContactSection";
import { DetailsSection } from "@/components/leads/leadDetailsPanel/DetailsSection";
import LeadStatus from "@/components/leads/leadDetailsPanel/LeadStatus";
import CommentsAndActivities from "@/components/leads/leadDetailsPanel/CommentsAndActivities";
import AdsImageSlider from "@/components/ads/AdsImageSlider";
import { LeadDetailsSkeleton } from "@/components/dashboardComponents/LeadDetailsSkeleton";
import { Lead } from "@/types/leads";
import { useLeadDetails, useUpdateLead } from "@/hooks/useLeadDetails";
import { useAppBranding } from "@/components/AppBrandingProvider";
import { isStatusOnlyLeadUpdate, normalizeLeadStatusId } from "@/lib/leadClientUpdate";
import { canAccessAllLeads } from "@/lib/roles";

export type LeadDetailsRouteMode = "admin" | "agent";

const ROUTE_CONFIG = {
  admin: {
    listPath: "/dashboard/all-leads",
    backLabel: "Back to All Leads",
    errorTitleClass: "text-gray-900 dark:text-white",
    bodyTextClass: "text-gray-600 dark:text-gray-400",
  },
  agent: {
    listPath: "/dashboard/leads",
    backLabel: "Back to My Leads",
    errorTitleClass: "text-gray-900! dark:text-white!",
    bodyTextClass: "text-gray-600! dark:text-gray-400!",
  },
} as const;

function LeadDetailsPageShell({
  lead,
  onLeadUpdated,
  onBack,
}: {
  lead: Lead;
  onLeadUpdated: (updatedLead: Lead) => Promise<boolean>;
  onBack: () => void;
}) {
  const { shortName } = useAppBranding();
  const [currentLead, setCurrentLead] = useState<Lead>(lead);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    details: true,
    contact: true,
    ads: true,
  });

  useEffect(() => {
    setCurrentLead(lead);
    if (lead) {
      const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
      const leadTitle = fullName || "Lead Details";
      document.title = `${leadTitle} - ${shortName}`;
    }
  }, [lead, shortName]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead) => {
      try {
        setCurrentLead(updatedLead);
        const ok = await onLeadUpdated(updatedLead);
        if (!ok) {
          setCurrentLead(lead);
        }
        return ok;
      } catch (error) {
        console.error("Error in handleLeadUpdated:", error);
        setCurrentLead(lead);
        return false;
      }
    },
    [lead, onLeadUpdated],
  );

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white dark:bg-gray-800">
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800 md:flex-row md:overflow-hidden">
        <div className="flex w-full min-w-0 shrink-0 flex-col border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50 md:h-full md:w-2/5 md:min-h-0 md:overflow-hidden md:border-b-0 md:border-r">
          <LeadHeader
            lead={currentLead}
            onClose={onBack}
            onNavigate={() => {}}
            hasPrevious={false}
            hasNext={false}
            hideNavigation={true}
            hideClose={true}
          />
          <div className="space-y-4 p-4 sm:space-y-6 sm:p-6 md:min-h-0 md:flex-1 md:overflow-y-auto">
            <LeadStatus
              lead={currentLead}
              onLeadUpdated={handleLeadUpdated}
            />
            <ContactSection
              lead={currentLead}
              isExpanded={expandedSections.contact}
              onToggle={() => toggleSection("contact")}
              onLeadUpdated={handleLeadUpdated}
            />
            <AdsImageSlider
              isExpanded={expandedSections.ads}
              onToggle={() => toggleSection("ads")}
            />
            <DetailsSection
              lead={currentLead}
              isExpanded={expandedSections.details}
              onToggle={() => toggleSection("details")}
              onLeadUpdated={handleLeadUpdated}
            />
          </div>
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-white dark:bg-gray-800 md:overflow-hidden">
          <CommentsAndActivities
            lead={currentLead}
            onLeadUpdated={handleLeadUpdated}
            key={currentLead._id}
          />
        </div>
      </div>
    </div>
  );
}

type LeadDetailsRoutePageProps = {
  mode: LeadDetailsRouteMode;
  params: Promise<{ id: string }>;
};

export function LeadDetailsRoutePage({ mode, params }: LeadDetailsRoutePageProps) {
  const config = ROUTE_CONFIG[mode];
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { shortName } = useAppBranding();
  const { id } = use(params);

  const { lead, isLoading, error } = useLeadDetails(
    status === "authenticated" ? id : null,
  );
  const { updateLeadAsync } = useUpdateLead();
  const queryClient = useQueryClient();

  const isRedirecting =
    status === "unauthenticated" ||
    (status === "authenticated" &&
      ((mode === "admin" && !canAccessAllLeads(session?.user)) ||
        (mode === "agent" && canAccessAllLeads(session?.user))));

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : `${config.listPath}/${id}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    if (status !== "authenticated") return;

    if (mode === "admin" && !canAccessAllLeads(session?.user)) {
      router.push("/dashboard");
      return;
    }

    if (mode === "agent" && canAccessAllLeads(session?.user)) {
      router.push(`/dashboard/all-leads/${id}`);
    }
  }, [config.listPath, id, mode, router, session, status]);

  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead) => {
      if (lead && isStatusOnlyLeadUpdate(lead, updatedLead)) {
        const normalized: Lead = {
          ...updatedLead,
          status: normalizeLeadStatusId(updatedLead.status),
        };
        queryClient.setQueryData(["lead", normalized._id], normalized);
        if (normalized.id && normalized.id !== normalized._id) {
          queryClient.setQueryData(["lead", normalized.id], normalized);
        }
        return true;
      }
      try {
        await updateLeadAsync(updatedLead);
        return true;
      } catch (updateError) {
        console.error("Error updating lead:", updateError);
        return false;
      }
    },
    [lead, queryClient, updateLeadAsync],
  );

  const handleBack = useCallback(() => {
    const query = searchParams?.toString() ?? "";
    const backUrl = query
      ? `${config.listPath}?${query}`
      : config.listPath;
    router.push(backUrl);
  }, [config.listPath, router, searchParams]);

  useEffect(() => {
    if (!lead) return;
    const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
    const leadTitle = fullName || "Lead Details";
    document.title = `${leadTitle} - ${shortName}`;
  }, [lead, shortName]);

  if (status === "loading" || isLoading || isRedirecting) {
    return <LeadDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dark:bg-gray-800">
        <div className="text-center">
          <h2
            className={`mb-2 text-xl font-semibold ${config.errorTitleClass}`}
          >
            Error Loading Lead
          </h2>
          <p className={`mb-4 ${config.bodyTextClass}`}>{error}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {config.backLabel}
          </Button>
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background dark:bg-gray-800">
        <div className="text-center">
          <h2
            className={`mb-2 text-xl font-semibold ${config.errorTitleClass}`}
          >
            Lead Not Found
          </h2>
          <p className={`mb-4 ${config.bodyTextClass}`}>
            The lead you&lsquo;re looking for doesn&lsquo;t exist or has been
            removed.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {config.backLabel}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <LeadDetailsPageShell
      lead={lead}
      onLeadUpdated={handleLeadUpdated}
      onBack={handleBack}
    />
  );
}
