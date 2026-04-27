"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  Suspense,
} from "react";
import { useSearchParams } from "next/navigation";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  setLayoutLoading: (loading: boolean) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const useSearchContext = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useSearchContext must be used within a SearchProvider");
  }
  return context;
};

interface SearchProviderProps {
  children: React.ReactNode;
}

/**
 * Mirrors the `?search=` URL param into context state. Runs once on mount
 * (so a refresh keeps the query) AND whenever the URL changes via
 * back/forward navigation. We compare values to avoid overwriting freshly
 * typed input that hasn't been committed to the URL yet.
 */
function SearchURLSync() {
  const searchParams = useSearchParams();
  const { searchQuery, setSearchQuery } = useSearchContext();
  const urlQuery = searchParams?.get("search") || "";

  useEffect(() => {
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
    }
    // We intentionally only react to URL changes, not local input churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  return null;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [searchQuery, setSearchQueryState] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query);
  }, []);
  const setLayoutLoading = useCallback((loading: boolean) => {
    setIsLoading(loading);
  }, []);

  const contextValue = useMemo<SearchContextType>(
    () => ({
      searchQuery,
      setSearchQuery,
      isLoading,
      setLayoutLoading,
    }),
    [searchQuery, isLoading, setSearchQuery, setLayoutLoading],
  );

  return (
    <SearchContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <SearchURLSync />
      </Suspense>
      {children}
    </SearchContext.Provider>
  );
};
