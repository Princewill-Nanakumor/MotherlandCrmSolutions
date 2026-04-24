// src/components/SimpleSessionProvider.tsx
"use client";

import { SessionProvider } from "next-auth/react";

export function SimpleSessionProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
