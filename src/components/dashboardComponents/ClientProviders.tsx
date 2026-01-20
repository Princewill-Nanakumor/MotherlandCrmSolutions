// src/components/ClientProviders.tsx
"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { StatusProvider } from "@/context/StatusContext";
import { createQueryClient } from "@/lib/queryClient";

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(() => createQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <StatusProvider>{children}</StatusProvider>
    </QueryClientProvider>
  );
}
