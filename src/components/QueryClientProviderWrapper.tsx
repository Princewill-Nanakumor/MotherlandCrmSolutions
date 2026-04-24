// src/components/QueryClientProviderWrapper.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { createQueryClient } from "@/lib/queryClient";

export function QueryClientProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // Create QueryClient on the client side to avoid server/client serialization issues
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
