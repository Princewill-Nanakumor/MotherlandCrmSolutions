import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEYS = {
  FILTER_BY_COUNTRY: "leads_filter_by_country",
  FILTER_BY_STATUS: "leads_filter_by_status",
  FILTER_BY_USER: "leads_filter_by_user",
  FILTER_BY_SOURCE: "leads_filter_by_source",
} as const;

const FILTER_DEBOUNCE_MS = 300;

type FilterMode = "include" | "exclude";

type UIState = {
  isDialogOpen: boolean;
  isUnassignDialogOpen: boolean;
  selectedUser: string;
  filterByCountry: string[];
  countryFilterMode: FilterMode;
  filterByStatus: string[];
  statusFilterMode: FilterMode;
  filterBySource: string[];
  sourceFilterMode: FilterMode;
  userFilterMode: FilterMode;
  searchQuery: string;
};

type Params = {
  searchParams: URLSearchParams;
  pathname: string;
  router: {
    replace: (href: string, options?: { scroll?: boolean }) => void;
  };
  searchQuery: string;
  filterByUser: string;
  setFilterByUser: (value: string) => void;
  filterJustChangedRef: React.MutableRefObject<boolean>;
  pendingPageFromPaginationRef: React.MutableRefObject<number | null>;
  setFilterJustChanged: (value: boolean) => void;
  setPageState: (value: number) => void;
  isInitialized: boolean;
};

export function useLeadsFilters({
  searchParams,
  pathname,
  router,
  searchQuery,
  filterByUser,
  setFilterByUser,
  filterJustChangedRef,
  pendingPageFromPaginationRef,
  setFilterJustChanged,
  setPageState,
  isInitialized,
}: Params) {
  const getInitialFilterValue = (
    key: string,
    urlValue: string | null,
    defaultValue: string[],
  ): string[] => {
    if (urlValue) {
      try {
        const parsed = JSON.parse(urlValue);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === "string" && parsed !== "all") return [parsed];
      } catch {
        if (urlValue !== "all") return [urlValue];
      }
    }
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(key);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed;
          if (typeof parsed === "string" && parsed !== "all") return [parsed];
        } catch {
          if (stored !== "all") return [stored];
        }
      }
    }
    return defaultValue;
  };

  const getInitialFilterMode = (
    urlMode: string | null,
    localStorageKey: string,
    defaultValue: FilterMode = "include",
  ): FilterMode => {
    if (urlMode === "include" || urlMode === "exclude") return urlMode;
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(localStorageKey);
      if (stored === "exclude" || stored === "include") return stored;
    }
    return defaultValue;
  };

  const initialCountry = searchParams.get("country");
  const initialStatus = searchParams.get("status");
  const initialSource = searchParams.get("source");
  const initialCountryMode = searchParams.get("countryMode");
  const initialStatusMode = searchParams.get("statusMode");
  const initialSourceMode = searchParams.get("sourceMode");
  const initialUserMode = searchParams.get("userMode");

  const [uiState, setUiState] = useState<UIState>({
    isDialogOpen: false,
    isUnassignDialogOpen: false,
    selectedUser: "",
    filterByCountry: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_COUNTRY,
      initialCountry,
      [],
    ),
    countryFilterMode: getInitialFilterMode(
      initialCountryMode,
      "countryFilterMode",
      "include",
    ),
    filterByStatus: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_STATUS,
      initialStatus,
      [],
    ),
    statusFilterMode: getInitialFilterMode(
      initialStatusMode,
      "statusFilterMode",
      "include",
    ),
    filterBySource: getInitialFilterValue(
      STORAGE_KEYS.FILTER_BY_SOURCE,
      initialSource,
      [],
    ),
    sourceFilterMode: getInitialFilterMode(
      initialSourceMode,
      "sourceFilterMode",
      "include",
    ),
    userFilterMode: getInitialFilterMode(
      initialUserMode,
      "userFilterMode",
      "include",
    ),
    searchQuery: searchQuery,
  });

  const [displayFilterByStatus, setDisplayFilterByStatus] = useState(
    uiState.filterByStatus,
  );
  const [displayFilterByCountry, setDisplayFilterByCountry] = useState(
    uiState.filterByCountry,
  );
  const [displayFilterBySource, setDisplayFilterBySource] = useState(
    uiState.filterBySource,
  );
  const [displayFilterByUser, setDisplayFilterByUser] = useState(filterByUser);

  const pendingFilterByStatusRef = useRef<string[] | null>(null);
  const pendingFilterByCountryRef = useRef<string[] | null>(null);
  const pendingFilterBySourceRef = useRef<string[] | null>(null);
  const pendingFilterByUserRef = useRef<string | null>(null);
  const filterDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const filterModeChangeInProgressRef = useRef(false);
  const prevSearchQueryRef = useRef(searchQuery);
  const prevSearchParamsStringRef = useRef(searchParams.toString());

  useEffect(() => {
    setUiState((prev) => ({ ...prev, searchQuery }));
  }, [searchQuery]);

  useEffect(() => {
    const urlUser = searchParams.get("user");
    if (!urlUser) return;
    try {
      const parsed = JSON.parse(urlUser);
      if (Array.isArray(parsed)) {
        const userFilterValue = parsed.length === 0 ? "all" : parsed.join(",");
        if (filterByUser !== userFilterValue) setFilterByUser(userFilterValue);
      } else if (typeof parsed === "string" && parsed !== "all") {
        if (filterByUser !== parsed) setFilterByUser(parsed);
      }
    } catch {
      if (urlUser !== "all" && filterByUser !== urlUser) setFilterByUser(urlUser);
    }
    // only for first mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (prevSearchQueryRef.current !== searchQuery) {
      prevSearchQueryRef.current = searchQuery;
      filterJustChangedRef.current = true;
      setFilterJustChanged(true);
      setPageState(1);
      pendingPageFromPaginationRef.current = null;
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      const currentSearch = params.get("search") || "";
      if (searchQuery !== currentSearch) {
        if (searchQuery) params.set("search", searchQuery);
        else params.delete("search");
        params.set("page", "1");
        const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
        window.history.replaceState(null, "", url);
      }
    }
  }, [
    filterJustChangedRef,
    pathname,
    pendingPageFromPaginationRef,
    router,
    searchParams,
    searchQuery,
    setFilterJustChanged,
    setPageState,
  ]);

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_COUNTRY,
        JSON.stringify(uiState.filterByCountry),
      );
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_STATUS,
        JSON.stringify(uiState.filterByStatus),
      );
      localStorage.setItem(
        STORAGE_KEYS.FILTER_BY_SOURCE,
        JSON.stringify(uiState.filterBySource),
      );
      localStorage.setItem("countryFilterMode", uiState.countryFilterMode);
      localStorage.setItem("statusFilterMode", uiState.statusFilterMode);
      localStorage.setItem("sourceFilterMode", uiState.sourceFilterMode);
      localStorage.setItem("userFilterMode", uiState.userFilterMode);
      window.dispatchEvent(new CustomEvent("countryFilterModeChanged"));
      window.dispatchEvent(new CustomEvent("statusFilterModeChanged"));
      window.dispatchEvent(new CustomEvent("sourceFilterModeChanged"));
      window.dispatchEvent(new CustomEvent("userFilterModeChanged"));
    }
  }, [
    isInitialized,
    uiState.filterByCountry,
    uiState.filterByStatus,
    uiState.filterBySource,
    uiState.countryFilterMode,
    uiState.statusFilterMode,
    uiState.sourceFilterMode,
    uiState.userFilterMode,
  ]);

  useEffect(() => {
    const urlCountry = searchParams.get("country");
    const urlStatus = searchParams.get("status");
    const urlSource = searchParams.get("source");
    const urlUser = searchParams.get("user");
    const urlCountryMode = searchParams.get("countryMode");
    const urlStatusMode = searchParams.get("statusMode");
    const urlSourceMode = searchParams.get("sourceMode");
    const urlUserMode = searchParams.get("userMode");

    const parseUrlParam = (param: string | null): string[] => {
      if (!param) return [];
      try {
        const parsed = JSON.parse(param);
        return Array.isArray(parsed) ? parsed : param !== "all" ? [param] : [];
      } catch {
        return param !== "all" ? [param] : [];
      }
    };

    if (filterJustChangedRef.current) {
      const urlStatusParsed = parseUrlParam(urlStatus);
      const urlCountryParsed = parseUrlParam(urlCountry);
      const urlSourceParsed = parseUrlParam(urlSource);
      const urlUserParsed = parseUrlParam(urlUser);
      const userFilterValue = urlUserParsed.length === 0 ? "all" : urlUserParsed.join(",");
      const urlMatchesState =
        JSON.stringify(urlStatusParsed) === JSON.stringify(uiState.filterByStatus) &&
        JSON.stringify(urlCountryParsed) === JSON.stringify(uiState.filterByCountry) &&
        JSON.stringify(urlSourceParsed) === JSON.stringify(uiState.filterBySource) &&
        filterByUser === userFilterValue;
      if (!urlMatchesState) return;
      filterJustChangedRef.current = false;
    }

    const targetCountry = parseUrlParam(urlCountry);
    if (
      (targetCountry.length > 0 || urlCountry === null) &&
      JSON.stringify(targetCountry) !== JSON.stringify(uiState.filterByCountry)
    ) {
      setUiState((prev) => ({ ...prev, filterByCountry: targetCountry }));
      setDisplayFilterByCountry(targetCountry);
      pendingFilterByCountryRef.current = targetCountry;
    }

    const targetStatus = parseUrlParam(urlStatus);
    if (
      (targetStatus.length > 0 || urlStatus === null) &&
      JSON.stringify(targetStatus) !== JSON.stringify(uiState.filterByStatus)
    ) {
      setUiState((prev) => ({ ...prev, filterByStatus: targetStatus }));
      setDisplayFilterByStatus(targetStatus);
      pendingFilterByStatusRef.current = targetStatus;
    }

    const targetSource = parseUrlParam(urlSource);
    if (
      (targetSource.length > 0 || urlSource === null) &&
      JSON.stringify(targetSource) !== JSON.stringify(uiState.filterBySource)
    ) {
      setUiState((prev) => ({ ...prev, filterBySource: targetSource }));
      setDisplayFilterBySource(targetSource);
      pendingFilterBySourceRef.current = targetSource;
    }

    const targetUser = parseUrlParam(urlUser);
    if (urlUser !== null) {
      const userFilterValue = targetUser.length === 0 ? "all" : targetUser.join(",");
      if (filterByUser !== userFilterValue) {
        setFilterByUser(userFilterValue);
        setDisplayFilterByUser(userFilterValue);
        pendingFilterByUserRef.current = userFilterValue;
      }
    } else if (filterByUser !== "all") {
      setFilterByUser("all");
      setDisplayFilterByUser("all");
      pendingFilterByUserRef.current = "all";
    }

    // Only adopt modes from the URL when Next's searchParams actually changed
    // (back/forward or router navigation). Mode toggles use history.replaceState,
    // which leaves searchParams stale — syncing then would snap modes back.
    const searchParamsString = searchParams.toString();
    const searchParamsChanged =
      searchParamsString !== prevSearchParamsStringRef.current;
    prevSearchParamsStringRef.current = searchParamsString;

    if (filterModeChangeInProgressRef.current) {
      filterModeChangeInProgressRef.current = false;
      return;
    }

    if (!searchParamsChanged) return;

    const syncMode = (
      urlMode: string | null,
      stateMode: FilterMode,
      key: keyof Pick<
        UIState,
        | "countryFilterMode"
        | "statusFilterMode"
        | "sourceFilterMode"
        | "userFilterMode"
      >,
    ) => {
      if (
        (urlMode === "include" || urlMode === "exclude") &&
        stateMode !== urlMode
      ) {
        setUiState((prev) => ({ ...prev, [key]: urlMode }));
      }
    };

    syncMode(urlCountryMode, uiState.countryFilterMode, "countryFilterMode");
    syncMode(urlStatusMode, uiState.statusFilterMode, "statusFilterMode");
    syncMode(urlSourceMode, uiState.sourceFilterMode, "sourceFilterMode");
    syncMode(urlUserMode, uiState.userFilterMode, "userFilterMode");
  }, [filterByUser, filterJustChangedRef, searchParams, setFilterByUser, uiState]);

  const commitFilters = useCallback(() => {
    const statuses = pendingFilterByStatusRef.current ?? uiState.filterByStatus;
    const countries =
      pendingFilterByCountryRef.current ?? uiState.filterByCountry;
    const sources = pendingFilterBySourceRef.current ?? uiState.filterBySource;
    const user = pendingFilterByUserRef.current ?? filterByUser;

    setUiState((prev) => ({
      ...prev,
      filterByStatus: statuses,
      filterByCountry: countries,
      filterBySource: sources,
    }));
    setFilterByUser(user);
    filterJustChangedRef.current = true;
    setFilterJustChanged(true);
    pendingPageFromPaginationRef.current = null;

    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set("page", "1");
    if (countries.length === 0) params.delete("country");
    else params.set("country", JSON.stringify(countries));
    if (statuses.length === 0) params.delete("status");
    else params.set("status", JSON.stringify(statuses));
    if (sources.length === 0) params.delete("source");
    else params.set("source", JSON.stringify(sources));
    if (user === "all") params.delete("user");
    else params.set("user", JSON.stringify(user.split(",")));
    params.set("countryMode", uiState.countryFilterMode);
    params.set("statusMode", uiState.statusFilterMode);
    params.set("sourceMode", uiState.sourceFilterMode);
    params.set("userMode", uiState.userFilterMode);
    const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    window.history.replaceState(null, "", url);
    prevSearchParamsStringRef.current = params.toString();

    pendingFilterByStatusRef.current = null;
    pendingFilterByCountryRef.current = null;
    pendingFilterBySourceRef.current = null;
    pendingFilterByUserRef.current = null;
  }, [
    filterByUser,
    filterJustChangedRef,
    pathname,
    pendingPageFromPaginationRef,
    searchParams,
    setFilterByUser,
    setFilterJustChanged,
    uiState.countryFilterMode,
    uiState.filterByCountry,
    uiState.filterBySource,
    uiState.filterByStatus,
    uiState.sourceFilterMode,
    uiState.statusFilterMode,
    uiState.userFilterMode,
  ]);

  const scheduleFilterCommit = useCallback(() => {
    if (filterDebounceTimerRef.current) clearTimeout(filterDebounceTimerRef.current);
    filterDebounceTimerRef.current = setTimeout(() => {
      filterDebounceTimerRef.current = null;
      commitFilters();
    }, FILTER_DEBOUNCE_MS);
  }, [commitFilters]);

  useEffect(
    () => () => {
      if (filterDebounceTimerRef.current) clearTimeout(filterDebounceTimerRef.current);
    },
    [],
  );

  const handleCountryFilterChange = useCallback(
    (countries: string[]) => {
      setDisplayFilterByCountry(countries);
      pendingFilterByCountryRef.current = countries;
      scheduleFilterCommit();
    },
    [scheduleFilterCommit],
  );

  const handleStatusFilterChange = useCallback(
    (statuses: string[]) => {
      setDisplayFilterByStatus(statuses);
      pendingFilterByStatusRef.current = statuses;
      scheduleFilterCommit();
    },
    [scheduleFilterCommit],
  );

  const handleSourceFilterChange = useCallback(
    (sources: string[]) => {
      setDisplayFilterBySource(sources);
      pendingFilterBySourceRef.current = sources;
      scheduleFilterCommit();
    },
    [scheduleFilterCommit],
  );

  const handleFilterChange = useCallback(
    (values: string[]) => {
      const value = values.length === 0 ? "all" : values.join(",");
      setDisplayFilterByUser(value);
      pendingFilterByUserRef.current = value;
      scheduleFilterCommit();
    },
    [scheduleFilterCommit],
  );

  const setMode = useCallback(
    (
      modeKey:
        | "countryFilterMode"
        | "statusFilterMode"
        | "sourceFilterMode"
        | "userFilterMode",
      mode: FilterMode,
      param: string,
    ) => {
      filterModeChangeInProgressRef.current = true;
      setFilterJustChanged(true);
      setPageState(1);
      setUiState((prev) => ({ ...prev, [modeKey]: mode }));
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      params.set(param, mode);
      // Keep other mode params aligned with current UI state
      if (modeKey !== "countryFilterMode") {
        params.set("countryMode", uiState.countryFilterMode);
      }
      if (modeKey !== "statusFilterMode") {
        params.set("statusMode", uiState.statusFilterMode);
      }
      if (modeKey !== "sourceFilterMode") {
        params.set("sourceMode", uiState.sourceFilterMode);
      }
      if (modeKey !== "userFilterMode") {
        params.set("userMode", uiState.userFilterMode);
      }
      const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      window.history.replaceState(null, "", url);
      prevSearchParamsStringRef.current = params.toString();
    },
    [
      pathname,
      searchParams,
      setFilterJustChanged,
      setPageState,
      uiState.countryFilterMode,
      uiState.sourceFilterMode,
      uiState.statusFilterMode,
      uiState.userFilterMode,
    ],
  );

  const handleCountryFilterModeChange = useCallback(
    (mode: FilterMode) => setMode("countryFilterMode", mode, "countryMode"),
    [setMode],
  );
  const handleStatusFilterModeChange = useCallback(
    (mode: FilterMode) => setMode("statusFilterMode", mode, "statusMode"),
    [setMode],
  );
  const handleSourceFilterModeChange = useCallback(
    (mode: FilterMode) => setMode("sourceFilterMode", mode, "sourceMode"),
    [setMode],
  );
  const handleUserFilterModeChange = useCallback(
    (mode: FilterMode) => setMode("userFilterMode", mode, "userMode"),
    [setMode],
  );

  const handlePageSizeChange = useCallback(
    (newPageSize: number) => {
      const size = Math.min(500, Math.max(1, newPageSize));
      setFilterJustChanged(true);
      pendingPageFromPaginationRef.current = null;
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", "1");
      params.set("pageSize", String(size));
      const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      window.history.replaceState(null, "", url);
    },
    [pathname, pendingPageFromPaginationRef, searchParams, setFilterJustChanged],
  );

  const handleServerPageChange = useCallback(
    (newPageOneBased: number) => {
      setFilterJustChanged(false);
      pendingPageFromPaginationRef.current = newPageOneBased;
      setPageState(newPageOneBased);
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      params.set("page", String(newPageOneBased));
      const url = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      window.history.replaceState(null, "", url);
    },
    [pathname, pendingPageFromPaginationRef, searchParams, setFilterJustChanged, setPageState],
  );

  const handleClearFilters = useCallback(() => {
    if (filterDebounceTimerRef.current) clearTimeout(filterDebounceTimerRef.current);
    pendingFilterByStatusRef.current = null;
    pendingFilterByCountryRef.current = null;
    pendingFilterBySourceRef.current = null;
    pendingFilterByUserRef.current = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_COUNTRY);
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_STATUS);
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_USER);
      localStorage.removeItem(STORAGE_KEYS.FILTER_BY_SOURCE);
      localStorage.removeItem("countryFilterMode");
      localStorage.removeItem("statusFilterMode");
      localStorage.removeItem("sourceFilterMode");
      localStorage.removeItem("userFilterMode");
    }
    setFilterJustChanged(true);
    filterJustChangedRef.current = true;
    filterModeChangeInProgressRef.current = true;
    pendingPageFromPaginationRef.current = null;
    setDisplayFilterByStatus([]);
    setDisplayFilterByCountry([]);
    setDisplayFilterBySource([]);
    setDisplayFilterByUser("all");
    setUiState((prev) => ({
      ...prev,
      filterByCountry: [],
      filterByStatus: [],
      filterBySource: [],
      countryFilterMode: "include",
      statusFilterMode: "include",
      sourceFilterMode: "include",
      userFilterMode: "include",
    }));
    setFilterByUser("all");
    window.history.replaceState(null, "", pathname);
    prevSearchParamsStringRef.current = "";
  }, [
    filterJustChangedRef,
    pathname,
    pendingPageFromPaginationRef,
    setFilterByUser,
    setFilterJustChanged,
  ]);

  return {
    uiState,
    setUiState,
    displayFilterByStatus,
    displayFilterByCountry,
    displayFilterBySource,
    displayFilterByUser,
    handleCountryFilterChange,
    handleCountryFilterModeChange,
    handleStatusFilterModeChange,
    handleSourceFilterModeChange,
    handleUserFilterModeChange,
    handleStatusFilterChange,
    handleSourceFilterChange,
    handleFilterChange,
    handlePageSizeChange,
    handleServerPageChange,
    handleClearFilters,
  };
}
