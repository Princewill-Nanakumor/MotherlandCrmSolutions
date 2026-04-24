// src/components/user-leads/URLStatemanager.tsx
"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

interface URLStateManagerProps {
  children: React.ReactNode;
}

export function URLStateManager({ children }: URLStateManagerProps) {
  const searchParams = useSearchParams()!;

  const [filterByCountry, setFilterByCountry] = useState<string>(() => {
    return searchParams.get("country") || "all";
  });

  // URL sync for country filter
  useEffect(() => {
    const urlCountry = searchParams.get("country");
    if (urlCountry && urlCountry !== filterByCountry) {
      setFilterByCountry(urlCountry);
    }
  }, [searchParams, filterByCountry]);

  return <div>{children}</div>;
}
