"use client";

import { createContext, useContext, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Create a context for search state
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
 * Reads search from URL once on mount (for refresh persistence).
 * Must not sync on every searchParams change, or we overwrite the user's input
 * while they type (URL updates async after setSearchQuery).
 */
function SearchURLSync() {
  const searchParams = useSearchParams();
  const { setSearchQuery } = useSearchContext();

  useEffect(() => {
    const query = searchParams.get("search") || "";
    setSearchQuery(query);
    // Only on mount: restore search from URL so refresh keeps the query
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export const SearchProvider: React.FC<SearchProviderProps> = ({ children }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const contextValue: SearchContextType = {
    searchQuery,
    setSearchQuery,
    isLoading,
    setLayoutLoading: setIsLoading,
  };

  return (
    <SearchContext.Provider value={contextValue}>
      <Suspense fallback={null}>
        <SearchURLSync />
      </Suspense>
      {children}
    </SearchContext.Provider>
  );
};
