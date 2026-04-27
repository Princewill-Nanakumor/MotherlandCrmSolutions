import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { Lead } from "@/types/leads";
import { User } from "@/types/user.types";

interface LeadsState {
  leads: Lead[];
  users: User[];
  selectedLeads: Lead[];
  selectedLead: Lead | null;
  statuses: Array<{ id: string; name: string; color?: string }>;
  isLoadingLeads: boolean;
  isLoadingUsers: boolean;
  isLoadingStatuses: boolean;
  filterByUser: string;
  filterByCountry: string;
  isPanelOpen: boolean;
  sorting: Array<{ id: string; desc: boolean }>;
  availableCountries: string[];
  filteredLeads: Lead[];
  setLeads: (leads: Lead[]) => void;
  setUsers: (users: User[]) => void;
  setStatuses: (
    statuses: Array<{ id: string; name: string; color?: string }>
  ) => void;
  setSelectedLeads: (leads: Lead[]) => void;
  setSelectedLead: (lead: Lead | null) => void;
  setFilterByUser: (filter: string) => void;
  setFilterByCountry: (filter: string) => void;
  setIsPanelOpen: (open: boolean) => void;
  setLoadingLeads: (loading: boolean) => void;
  setLoadingUsers: (loading: boolean) => void;
  setLoadingStatuses: (loading: boolean) => void;
  setSorting: (sorting: Array<{ id: string; desc: boolean }>) => void;
  clearFilters: () => void;
  clearSelection: () => void;
  updateLead: (leadId: string, updates: Partial<Lead>) => void;
  updateLeadOptimistically: (leadId: string, updates: Partial<Lead>) => void;
  revertLeadUpdate: (leadId: string, originalData: Partial<Lead>) => void;
  selectAllLeads: () => void;
  deselectAllLeads: () => void;
  toggleLeadSelection: (leadId: string) => void;
}

const getAssignedUserId = (assignedTo: Lead["assignedTo"]): string | null => {
  if (!assignedTo) return null;
  if (typeof assignedTo === "string") return assignedTo;
  if (assignedTo && typeof assignedTo === "object") {
    const assignedToObj = assignedTo as Record<string, unknown>;
    return (
      (assignedToObj.id as string) || (assignedToObj._id as string) || null
    );
  }
  return null;
};

const resolveStatusName = (
  statusId: string,
  statuses: Array<{ id: string; name: string; color?: string }>
): string => {
  const status = statuses.find((s) => s.id === statusId);
  return status?.name || statusId;
};

const processLeadsWithStatuses = (leads: Lead[]): Lead[] => {
  return leads.map((lead) => ({ ...lead }));
};

const filterLeadsByUser = (leads: Lead[], filterByUser: string): Lead[] => {
  if (filterByUser === "all") return leads;
  if (filterByUser === "unassigned") {
    return leads.filter((lead) => !getAssignedUserId(lead.assignedTo));
  }
  return leads.filter(
    (lead) => getAssignedUserId(lead.assignedTo) === filterByUser
  );
};

const filterLeadsByCountry = (
  leads: Lead[],
  filterByCountry: string
): Lead[] => {
  if (!filterByCountry || filterByCountry === "all") return leads;
  return leads.filter(
    (lead) => lead.country?.toLowerCase() === filterByCountry.toLowerCase()
  );
};

const getAvailableCountries = (leads: Lead[]): string[] => {
  const countrySet = new Set<string>();
  leads.forEach((lead) => {
    if (lead.country?.trim()) {
      countrySet.add(lead.country.toLowerCase());
    }
  });
  return Array.from(countrySet).sort();
};

const getFilteredLeads = (
  leads: Lead[],
  filterByUser: string,
  filterByCountry: string
): Lead[] => {
  let filtered = leads;
  if (filterByUser !== "all") {
    filtered = filterLeadsByUser(filtered, filterByUser);
  }
  if (filterByCountry !== "all") {
    filtered = filterLeadsByCountry(filtered, filterByCountry);
  }
  return filtered;
};

export const useLeadsStore = create<LeadsState>()(
  devtools(
    persist(
      subscribeWithSelector((set) => ({
        leads: [],
        users: [],
        statuses: [],
        selectedLeads: [],
        selectedLead: null,
        isLoadingLeads: false,
        isLoadingUsers: false,
        isLoadingStatuses: false,
        filterByUser: "all",
        filterByCountry: "all",
        isPanelOpen: false,
        sorting: [],
        availableCountries: [],
        filteredLeads: [],
        setLeads: (leads) =>
          set((state) => {
            const processedLeads = processLeadsWithStatuses(leads);
            const availableCountries = getAvailableCountries(processedLeads);
            const filteredLeads = getFilteredLeads(
              processedLeads,
              state.filterByUser,
              state.filterByCountry
            );
            return {
              leads: processedLeads,
              availableCountries,
              filteredLeads,
              selectedLeads: state.selectedLeads.filter((selected) =>
                processedLeads.some((lead) => lead._id === selected._id)
              ),
            };
          }),
        setUsers: (users) => set({ users }),
        setStatuses: (statuses) =>
          set((state) => {
            const processedLeads = processLeadsWithStatuses(state.leads);
            const filteredLeads = getFilteredLeads(
              processedLeads,
              state.filterByUser,
              state.filterByCountry
            );
            return {
              statuses,
              leads: processedLeads,
              filteredLeads,
            };
          }),
        setSelectedLeads: (selectedLeads) => set({ selectedLeads }),
        setSelectedLead: (selectedLead) => set({ selectedLead }),
        setFilterByUser: (filterByUser) =>
          set((state) => {
            const filteredLeads = getFilteredLeads(
              state.leads,
              filterByUser,
              state.filterByCountry
            );
            return {
              filterByUser,
              filteredLeads,
              selectedLeads: [],
            };
          }),
        setFilterByCountry: (filterByCountry) =>
          set((state) => {
            const filteredLeads = getFilteredLeads(
              state.leads,
              state.filterByUser,
              filterByCountry
            );
            return {
              filterByCountry,
              filteredLeads,
              selectedLeads: [],
            };
          }),
        setIsPanelOpen: (isPanelOpen) => set({ isPanelOpen }),
        setLoadingLeads: (isLoadingLeads) => set({ isLoadingLeads }),
        setLoadingUsers: (isLoadingUsers) => set({ isLoadingUsers }),
        setLoadingStatuses: (isLoadingStatuses) => set({ isLoadingStatuses }),
        setSorting: (sorting) => set({ sorting }),
        clearFilters: () =>
          set((state) => {
            const filteredLeads = getFilteredLeads(state.leads, "all", "all");
            return {
              filterByUser: "all",
              filterByCountry: "all",
              filteredLeads,
              selectedLeads: [],
            };
          }),
        clearSelection: () => set({ selectedLeads: [] }),
        updateLead: (leadId, updates) =>
          set((state) => {
            const updatedLeads = state.leads.map((lead) =>
              lead._id === leadId ? { ...lead, ...updates } : lead
            );
            const updatedSelectedLeads = state.selectedLeads.map((lead) =>
              lead._id === leadId ? { ...lead, ...updates } : lead
            );
            const updatedSelectedLead =
              state.selectedLead?._id === leadId
                ? { ...state.selectedLead, ...updates }
                : state.selectedLead;
            const availableCountries = getAvailableCountries(updatedLeads);
            const filteredLeads = getFilteredLeads(
              updatedLeads,
              state.filterByUser,
              state.filterByCountry
            );
            return {
              leads: updatedLeads,
              selectedLeads: updatedSelectedLeads,
              selectedLead: updatedSelectedLead,
              availableCountries,
              filteredLeads,
            };
          }),
        // Add this optimized update function to your store:
        updateLeadOptimistically: (leadId, updates) =>
          set((state) => {
            // Check if the update is actually needed
            const existingLead = state.leads.find(
              (lead) => lead._id === leadId
            );
            if (!existingLead) return state;

            // Check if any values actually changed
            const hasChanges = Object.keys(updates).some(
              (key) =>
                existingLead[key as keyof Lead] !== updates[key as keyof Lead]
            );

            if (!hasChanges) {
              return state;
            }

            const updatedLeads = state.leads.map((lead) =>
              lead._id === leadId ? { ...lead, ...updates } : lead
            );
            const updatedSelectedLeads = state.selectedLeads.map((lead) =>
              lead._id === leadId ? { ...lead, ...updates } : lead
            );
            const updatedSelectedLead =
              state.selectedLead?._id === leadId
                ? { ...state.selectedLead, ...updates }
                : state.selectedLead;

            // Only recalculate if countries might have changed
            const needsCountryRecalc = updates.country !== undefined;
            const availableCountries = needsCountryRecalc
              ? getAvailableCountries(updatedLeads)
              : state.availableCountries;

            const filteredLeads = getFilteredLeads(
              updatedLeads,
              state.filterByUser,
              state.filterByCountry
            );

            return {
              leads: updatedLeads,
              selectedLeads: updatedSelectedLeads,
              selectedLead: updatedSelectedLead,
              availableCountries,
              filteredLeads,
            };
          }),
        revertLeadUpdate: (leadId, originalData) =>
          set((state) => {
            const revertedLeads = state.leads.map((lead) =>
              lead._id === leadId ? { ...lead, ...originalData } : lead
            );
            const revertedSelectedLeads = state.selectedLeads.map((lead) =>
              lead._id === leadId ? { ...lead, ...originalData } : lead
            );
            const revertedSelectedLead =
              state.selectedLead?._id === leadId
                ? { ...state.selectedLead, ...originalData }
                : state.selectedLead;
            const availableCountries = getAvailableCountries(revertedLeads);
            const filteredLeads = getFilteredLeads(
              revertedLeads,
              state.filterByUser,
              state.filterByCountry
            );
            return {
              leads: revertedLeads,
              selectedLeads: revertedSelectedLeads,
              selectedLead: revertedSelectedLead,
              availableCountries,
              filteredLeads,
            };
          }),
        selectAllLeads: () =>
          set((state) => ({ selectedLeads: [...state.filteredLeads] })),
        deselectAllLeads: () => set({ selectedLeads: [] }),
        toggleLeadSelection: (leadId) =>
          set((state) => {
            const isSelected = state.selectedLeads.some(
              (lead) => lead._id === leadId
            );
            if (isSelected) {
              return {
                selectedLeads: state.selectedLeads.filter(
                  (lead) => lead._id !== leadId
                ),
              };
            } else {
              const leadToAdd = state.filteredLeads.find(
                (lead) => lead._id === leadId
              );
              return {
                selectedLeads: leadToAdd
                  ? [...state.selectedLeads, leadToAdd]
                  : state.selectedLeads,
              };
            }
          }),
      })),
      {
        name: "leads-store",
        partialize: (state) => ({
          filterByUser: state.filterByUser,
          filterByCountry: state.filterByCountry,
          sorting: state.sorting,
        }),
      }
    )
  )
);

// --- Hooks ---

export const useSelectedLead = () =>
  useLeadsStore((state) => state.selectedLead);
export const useSelectedLeads = () =>
  useLeadsStore((state) => state.selectedLeads);
export const useAssignedLeadsCount = () =>
  useLeadsStore(
    (state) =>
      state.selectedLeads.filter((lead) => getAssignedUserId(lead.assignedTo))
        .length
  );
export const useSetSelectedLead = () =>
  useLeadsStore((state) => state.setSelectedLead);
export const useSetIsPanelOpen = () =>
  useLeadsStore((state) => state.setIsPanelOpen);
export const useSetSelectedLeads = () =>
  useLeadsStore((state) => state.setSelectedLeads);
export const useSetFilterByUser = () =>
  useLeadsStore((state) => state.setFilterByUser);
export const useSetFilterByCountry = () =>
  useLeadsStore((state) => state.setFilterByCountry);
export const useSetLeads = () => useLeadsStore((state) => state.setLeads);
export const useSetUsers = () => useLeadsStore((state) => state.setUsers);
export const useSetStatuses = () => useLeadsStore((state) => state.setStatuses);
export const useSetLoadingLeads = () =>
  useLeadsStore((state) => state.setLoadingLeads);
export const useSetLoadingUsers = () =>
  useLeadsStore((state) => state.setLoadingUsers);
export const useSetLoadingStatuses = () =>
  useLeadsStore((state) => state.setLoadingStatuses);
export const useUpdateLeadOptimistically = () =>
  useLeadsStore((state) => state.updateLeadOptimistically);
export const useRevertLeadUpdate = () =>
  useLeadsStore((state) => state.revertLeadUpdate);
export const useSorting = () => useLeadsStore((state) => state.sorting);
export const useSetSorting = () => useLeadsStore((state) => state.setSorting);
export const useFilterByUser = () =>
  useLeadsStore((state) => state.filterByUser);
export const useFilterByCountry = () =>
  useLeadsStore((state) => state.filterByCountry);
export const useIsPanelOpen = () => useLeadsStore((state) => state.isPanelOpen);
export const useIsLoadingLeads = () =>
  useLeadsStore((state) => state.isLoadingLeads);
export const useIsLoadingUsers = () =>
  useLeadsStore((state) => state.isLoadingUsers);
export const useIsLoadingStatuses = () =>
  useLeadsStore((state) => state.isLoadingStatuses);
export const useStatuses = () => useLeadsStore((state) => state.statuses);
export const useResolveStatus = () =>
  useLeadsStore(
    (state) => (statusId: string) => resolveStatusName(statusId, state.statuses)
  );
export const useAvailableCountries = () =>
  useLeadsStore((state) => state.availableCountries);
export const useFilteredLeads = () =>
  useLeadsStore((state) => state.filteredLeads);
export const useLeadsCounts = () =>
  useLeadsStore((state) => ({
    total: state.leads.length,
    filtered: state.filteredLeads.length,
    selected: state.selectedLeads.length,
    countries: state.availableCountries.length,
  }));
export const useHasAssignedLeads = () =>
  useLeadsStore((state) =>
    state.selectedLeads.some((lead) => getAssignedUserId(lead.assignedTo))
  );
export const useSelectAllLeads = () =>
  useLeadsStore((state) => state.selectAllLeads);
export const useDeselectAllLeads = () =>
  useLeadsStore((state) => state.deselectAllLeads);
export const useToggleLeadSelection = () =>
  useLeadsStore((state) => state.toggleLeadSelection);
export const useClearFilters = () =>
  useLeadsStore((state) => state.clearFilters);
export const useClearSelection = () =>
  useLeadsStore((state) => state.clearSelection);
