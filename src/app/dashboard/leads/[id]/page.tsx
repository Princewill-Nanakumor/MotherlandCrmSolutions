// src/app/dashboard/leads/[id]/page.tsx
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

// Lead Details Content Component
const LeadDetailsPageContent = ({
  lead,
  onLeadUpdated,
  onBack,
}: {
  lead: Lead;
  onLeadUpdated: (updatedLead: Lead) => Promise<boolean>;
  onBack: () => void;
}) => {
  const [currentLead, setCurrentLead] = useState<Lead>(lead);
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    details: true,
    contact: true,
    ads: true,
  });

  // Update current lead when prop changes and update page title
  useEffect(() => {
    setCurrentLead(lead);
    if (lead) {
      const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
      const leadTitle = fullName || "Lead Details";
      document.title = `${leadTitle} - zodaShield`;
    }
  }, [lead]);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  }, []);

  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead) => {
      try {
        // Immediately update local state
        setCurrentLead(updatedLead);

        // Call the parent update handler (which uses React Query mutation)
        await onLeadUpdated(updatedLead);

        return true;
      } catch (error) {
        console.error("Error in handleLeadUpdated:", error);
        return false;
      }
    },
    [onLeadUpdated]
  );

  const handleNavigate = () => {};
  const hasPrevious = false;
  const hasNext = false;

  return (
    <div className="h-screen bg-white dark:bg-gray-800 flex flex-col">
      <div
        className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
        style={{
          height: "calc(100vh - 0px)",
        }}
      >
        {/* Left Panel - Lead Details */}
        <div className="w-2/5 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-800/50">
          <LeadHeader
            lead={currentLead}
            onClose={onBack}
            onNavigate={handleNavigate}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            hideNavigation={true}
            hideClose={true}
          />
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <LeadStatus lead={currentLead} onLeadUpdated={handleLeadUpdated} />
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
};

interface LeadDetailsPageProps {
  params: Promise<{
    id: string;
  }>;
}

const LeadDetailsPage: React.FC<LeadDetailsPageProps> = ({ params }) => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { id } = use(params);

  // ✅ Use React Query hook for fetching lead
  const { lead, isLoading, error, refetch } = useLeadDetails(
    status === "authenticated" ? id : null
  );

  // ✅ Use React Query mutation for updating lead
  const { updateLeadAsync } = useUpdateLead();

  useEffect(() => {
    console.log("🔍 LEAD DETAIL PAGE EFFECT TRIGGERED");
    console.log("📋 Effect state:", {
      status: status,
      userRole: session?.user?.role,
      userId: session?.user?.id,
      leadId: id,
    });

    if (status === "unauthenticated") {
      console.log("❌ User not authenticated - redirecting to homepage");
      router.push("/");
    } else if (status === "authenticated" && session?.user?.role === "ADMIN") {
      console.log("🔀 Admin user - redirecting to admin leads page");
      router.push(`/dashboard/all-leads/${id}`);
    } else if (status === "authenticated") {
      console.log("✅ User authenticated - staying on user leads page");
    }
  }, [status, session, router, id]);

  const handleLeadUpdated = useCallback(
    async (updatedLead: Lead) => {
      try {
        // Call the mutation
        await updateLeadAsync(updatedLead);

        // Force refetch to get fresh data
        await refetch();

        return true;
      } catch (error) {
        console.error("Error updating lead:", error);
        return false;
      }
    },
    [updateLeadAsync, refetch]
  );

  // Handle back navigation - preserve filters
  const handleBack = useCallback(() => {
    const params = searchParams.toString();
    const backUrl = params ? `/dashboard/leads?${params}` : "/dashboard/leads";
    router.push(backUrl);
  }, [router, searchParams]);

  // Update page title when lead is loaded or updated
  useEffect(() => {
    if (lead) {
      const fullName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim();
      const leadTitle = fullName || "Lead Details";
      document.title = `${leadTitle} - zodaShield`;
    }
  }, [lead]);

  // Loading state - using skeleton
  if (status === "loading" || isLoading) {
    return <LeadDetailsSkeleton />;
  }

  if (status === "unauthenticated") {
    return null;
  }

  // Admins are redirected in useEffect, so this won't render for them
  if (status === "authenticated" && session?.user?.role === "ADMIN") {
    return null;
  }

  // Error state
  if (error) {
    console.log("❌ LEAD DETAIL PAGE ERROR:", error);
    return (
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Error Loading Lead
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Leads
          </Button>
        </div>
      </div>
    );
  }

  // Lead not found
  if (!lead) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background dark:bg-gray-800">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Lead Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The lead you&lsquo;re looking for doesn&lsquo;t exist or has been
            removed.
          </p>
          <Button onClick={handleBack} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to My Leads
          </Button>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <LeadDetailsPageContent
      lead={lead}
      onLeadUpdated={handleLeadUpdated}
      onBack={handleBack}
    />
  );
};

export default LeadDetailsPage;
