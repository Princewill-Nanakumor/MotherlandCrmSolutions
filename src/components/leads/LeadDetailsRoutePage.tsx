"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, use, useCallback } from "react";
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
import { isStatusOnlyLeadUpdate } from "@/lib/leadClientUpdate";

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
    <div className="h-screen bg-white dark:bg-gray-800 flex flex-col">
      <div
        className="flex h-screen rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex w-2/5 flex-col border-r border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50">
          <LeadHeader
            lead={currentLead}
            onClose={onBack}
            onNavigate={() => {}}
            hasPrevious={false}
            hasNext={false}
            hideNavigation={true}
            hideClose={true}
          />
          <div className="flex-1 space-y-6 overflow-y-auto p-6">
            <LeadStatus lead={currentLead} />
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
        <div className="flex-1 bg-white dark:bg-gray-800">
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

    if (mode === "admin" && session?.user?.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    if (mode === "agent" && session?.user?.role === "ADMIN") {
      router.push(`/dashboard/all-leads/${id}`);
    }
  }, [config.listPath, id, mode, router, session, status]);

  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead) => {
      if (mode === "agent" && lead && isStatusOnlyLeadUpdate(lead, updatedLead)) {
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
    [lead, mode, updateLeadAsync],
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

  if (status === "loading" || isLoading) {
    return <LeadDetailsSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  if (mode === "admin" && session?.user?.role !== "ADMIN") {
    return null;
  }

  if (mode === "agent" && session?.user?.role === "ADMIN") {
    return null;
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
