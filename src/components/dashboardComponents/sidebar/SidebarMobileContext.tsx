"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type SidebarMobileContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
  close: () => void;
};

const SidebarMobileContext = createContext<SidebarMobileContextValue | null>(
  null,
);

export function SidebarMobileProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);
  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, setOpen, toggle, close }),
    [open, toggle, close],
  );

  return (
    <SidebarMobileContext.Provider value={value}>
      {children}
    </SidebarMobileContext.Provider>
  );
}

export function useSidebarMobile() {
  const ctx = useContext(SidebarMobileContext);
  if (!ctx) {
    throw new Error("useSidebarMobile must be used within SidebarMobileProvider");
  }
  return ctx;
}
