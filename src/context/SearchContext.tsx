"use client";

import { createContext, useContext, useState } from "react";

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
      {children}
    </SearchContext.Provider>
  );
};
